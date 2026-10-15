/**
 * `app-date-input` form değeri: yerel `<input type="date|datetime-local|time">` ile aynı metin biçimi.
 * Saat dilimi dönüşümü YOKTUR (duvar saati olduğu gibi taşınır); İstanbul/UTC dönüşümlerini sayfalar mevcut
 * `date.utils` işlevleriyle bu metin üzerinden yapar.
 */
export type DateInputType = 'date' | 'datetime-local' | 'time';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

function build(y: number, mo: number, d: number, h: number, mi: number): Date | null {
    const date = new Date(2000, 0, 1, 0, 0, 0, 0);

    date.setFullYear(y, mo - 1, d); // `new Date(26, …)` 1926 yapmasın
    date.setHours(h, mi, 0, 0);
    const valid = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && h >= 0 && h < 24 && mi >= 0 && mi < 60;

    return valid ? date : null;
}

/** Form metni → `Date` (yerel duvar saati). Boş veya geçersiz metin için `null`. */
export function parseDateInputValue(type: DateInputType, value: string | null | undefined): Date | null {
    const s = (value ?? '').trim();

    if (!s) {
        return null;
    }

    if (type === 'time') {
        const m = TIME_RE.exec(s);

        if (!m) {
            return null;
        }

        const now = new Date();

        return build(now.getFullYear(), now.getMonth() + 1, now.getDate(), Number(m[1]), Number(m[2]));
    }

    if (type === 'date') {
        const m = DATE_RE.exec(s) ?? DATETIME_RE.exec(s);

        return m ? build(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0) : null;
    }

    const dt = DATETIME_RE.exec(s);

    if (dt) {
        return build(Number(dt[1]), Number(dt[2]), Number(dt[3]), Number(dt[4]), Number(dt[5]));
    }

    const d = DATE_RE.exec(s);

    return d ? build(Number(d[1]), Number(d[2]), Number(d[3]), 0, 0) : null;
}

/** `Date` → form metni (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`, `HH:mm`). */
export function formatDateInputValue(type: DateInputType, date: Date | null | undefined): string {
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }

    const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    if (type === 'time') {
        return hm;
    }

    const ymd = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    return type === 'date' ? ymd : `${ymd}T${hm}`;
}

/** Ayırıcının önüne konacağı rakam sırası → ayırıcı (gg.aa.yyyy ss:dd). */
const SEPARATOR_BEFORE_DIGIT: Record<DateInputType, Record<number, string>> = {
    date: { 2: '.', 4: '.' },
    'datetime-local': { 2: '.', 4: '.', 8: ' ', 10: ':' },
    time: { 2: ':' }
};

const ISO_RE = /^\s*(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/** Rakam konumlarının bölümleri: d=gün, m=ay, y=yıl, h=saat, n=dakika. */
const FIELD_LAYOUT: Record<DateInputType, string> = {
    date: 'ddmmyyyy',
    'datetime-local': 'ddmmyyyyhhnn',
    time: 'hhnn'
};

/** Sıradaki rakam, şimdiye kadar kabul edilenlere göre bölümünün sınırları içinde mi? (gün 01–31, ay 01–12, saat 00–23, dakika 00–59) */
function isDigitAllowed(layout: string, accepted: string, digit: string): boolean {
    const index = accepted.length;
    const slot = layout[index];

    if (!slot) {
        return false;
    }

    const d = Number(digit);
    const second = index > 0 && layout[index - 1] === slot;
    const prev = second ? accepted[index - 1] : '';

    switch (slot) {
        case 'd':
            return !second ? d <= 3 : prev === '0' ? d >= 1 : prev === '3' ? d <= 1 : true;
        case 'm':
            return !second ? d <= 1 : prev === '0' ? d >= 1 : d <= 2;
        case 'h':
            return !second ? d <= 2 : prev === '2' ? d <= 3 : true;
        case 'n':
            return !second ? d <= 5 : true;
        default:
            return true; // yıl: 4 rakam serbest (aralık denetimi min/max ile)
    }
}

/**
 * Geçersiz rakamları atar (ör. ayın ilk rakamı 5 → atılır; `21.55` yazılamaz) ve biçimin rakam sayısıyla sınırlar.
 * @param caretDigits İmleçten önceki ham rakam sayısı; çıktıda imleçten önceki kabul edilen rakam sayısına çevrilir.
 */
function acceptDigits(type: DateInputType, rawDigits: string, caretDigits: number): { digits: string; caretDigits: number } {
    const layout = FIELD_LAYOUT[type];
    let accepted = '';
    let acceptedBeforeCaret = 0;

    for (let i = 0; i < rawDigits.length; i++) {
        if (isDigitAllowed(layout, accepted, rawDigits[i])) {
            accepted += rawDigits[i];

            if (i < caretDigits) {
                acceptedBeforeCaret++;
            }
        }
    }

    return { digits: accepted, caretDigits: acceptedBeforeCaret };
}

export interface MaskedInput {
    text: string;
    caret: number;
}

const countDigits = (s: string): number => (s.match(/\d/g) ?? []).length;

/** `2411` → `24.11` (ayırıcı yalnız iki rakam grubu arasına girer; sondaki boş ayırıcı bırakılmaz). */
function insertSeparators(type: DateInputType, digits: string): string {
    const seps = SEPARATOR_BEFORE_DIGIT[type];
    let out = '';

    for (let i = 0; i < digits.length; i++) {
        out += (seps[i] ?? '') + digits[i];
    }

    return out;
}

/** `digitCount` rakamdan sonraki imleç konumu (biçimli metinde). */
function caretAfterDigits(formatted: string, digitCount: number): number {
    if (digitCount <= 0) {
        return 0;
    }

    let seen = 0;

    for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
            seen++;

            if (seen === digitCount) {
                return i + 1;
            }
        }
    }

    return formatted.length;
}

/**
 * Yazarken maske: yalnız rakam alınır, `gg.aa.yyyy` / `gg.aa.yyyy ss:dd` / `ss:dd` ayırıcıları kendiliğinden eklenir,
 * uzunluk biçimle sınırlanır. `24111991` ve `24.11.1991` aynı sonucu verir; `1991-11-24` (ISO) yapıştırılırsa çevrilir.
 * Silmede yalnız ayırıcı gitmişse (rakamlar değişmedi) imlecin yanındaki rakam silinir; böylece ayırıcıda takılmaz.
 * @param previous Bu girdi olayından önceki (maskelenmiş) metin; yalnız silme tespiti için.
 * @param inputType `InputEvent.inputType` (ör. `deleteContentBackward`).
 */
export function applyDateMask(type: DateInputType, raw: string, caret: number, previous = '', inputType = ''): MaskedInput {
    let text = raw;
    let pos = Math.min(caret, raw.length);
    const iso = ISO_RE.exec(raw);

    if (iso) {
        text = `${iso[3]}${iso[2]}${iso[1]}${iso[4] ? iso[4] + iso[5] : ''}`;
        pos = text.length;
    }

    let digits = text.replace(/\D/g, '');
    let digitsBeforeCaret = countDigits(text.slice(0, pos));

    if (!iso && inputType.startsWith('delete') && previous && digits === previous.replace(/\D/g, '') && digits.length > 0) {
        const backward = inputType === 'deleteContentBackward';
        const index = backward ? digitsBeforeCaret - 1 : digitsBeforeCaret;

        if (index >= 0 && index < digits.length) {
            digits = digits.slice(0, index) + digits.slice(index + 1);

            if (backward) {
                digitsBeforeCaret--;
            }
        }
    }

    const accepted = acceptDigits(type, digits, digitsBeforeCaret);
    const formatted = insertSeparators(type, accepted.digits);

    return { text: formatted, caret: caretAfterDigits(formatted, accepted.caretDigits) };
}

/** Yazı yalnız tam bir tarih mi (`gg.aa.yyyy`, saat yok)? Tarih-saat alanında saatin atlandığını anlamak için. */
export function isDateWithoutTime(text: string): boolean {
    return /^\s*\d{2}\.\d{2}\.\d{4}\s*$/.test(text);
}

/** Görüntü biçimi: `gg.aa.yyyy`, `gg.aa.yyyy ss:dd`, `ss:dd` (hata mesajlarında). */
export function formatDateInputDisplay(type: DateInputType, date: Date): string {
    const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    if (type === 'time') {
        return hm;
    }

    const dmy = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${pad(date.getFullYear(), 4)}`;

    return type === 'date' ? dmy : `${dmy} ${hm}`;
}
