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
