const DEFAULT_LOCALE = 'tr-TR';
const DEFAULT_UTC_DISPLAY_TIME_ZONE = 'Europe/Istanbul';

/** Rapor `from`/`to` filtreleri — kullanıcı `yyyy-MM-dd` ile Türkiye takvim gününü seçer; API UTC anı bekler. */
const REPORT_FILTER_TIME_ZONE = DEFAULT_UTC_DISPLAY_TIME_ZONE;

/** Yerel takvim günü `yyyy-MM-dd` (form `type="date"`; liste API `dateFromUtc`/`dateToUtc` dönüşümü mapper’da). */
export function localDateYyyyMmDd(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function formatDateDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatTimeDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatDateTimeDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

function hasExplicitIso8601Zone(s: string): boolean {
    return /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(s.trim());
}

/**
 * `paidAtUtc` gibi alanlar: sunucu UTC anını döndürür; bazen `Z` / offset olmadan (`2026-04-20T03:03:00`)
 * gelir ve `new Date` bunu yerel saat sanarak 3 saat geri gösterebilir.
 * Offset yoksa UTC kabul edilir.
 */
export function parseUtcApiInstantIsoString(value: string | null | undefined): Date | null {
    if (value == null) {
        return null;
    }
    let s = value.trim();
    if (!s) {
        return null;
    }
    if (s.includes(' ') && !s.includes('T')) {
        s = s.replace(' ', 'T');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const normalized = hasExplicitIso8601Zone(s) ? s : `${s}Z`;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** UTC ISO anını kullanıcı yerel saatine çevirip `formatDateTimeDisplay` ile aynı biçimde gösterir. */
export function formatUtcIsoAsLocalDateTimeDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return '—';
        }
        return new Intl.DateTimeFormat(locale, {
            timeZone: DEFAULT_UTC_DISPLAY_TIME_ZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(value);
    }
    const d = parseUtcApiInstantIsoString(value);
    if (!d) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, {
        timeZone: DEFAULT_UTC_DISPLAY_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

/** UTC ISO anı -> Europe/Istanbul tarih (`dd.MM.yyyy`) */
export function formatUtcIsoAsLocalDateDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    const d = value instanceof Date ? value : parseUtcApiInstantIsoString(value);
    if (!d || Number.isNaN(d.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, {
        timeZone: DEFAULT_UTC_DISPLAY_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

/** UTC ISO anı -> Europe/Istanbul saat (`HH:mm`) */
export function formatUtcIsoAsLocalTimeDisplay(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
    if (value == null || value === '') {
        return '—';
    }
    const d = value instanceof Date ? value : parseUtcApiInstantIsoString(value);
    if (!d || Number.isNaN(d.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale, {
        timeZone: DEFAULT_UTC_DISPLAY_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

/** Alias: UTC anı -> local datetime (TR/Istanbul). */
export function formatUtcToLocalDateTime(value: string | Date | null | undefined): string {
    return formatUtcIsoAsLocalDateTimeDisplay(value);
}

/** Alias: UTC anı -> local date (TR/Istanbul). */
export function formatUtcToLocalDate(value: string | Date | null | undefined): string {
    return formatUtcIsoAsLocalDateDisplay(value);
}

/** Alias: UTC anı -> local time (TR/Istanbul). */
export function formatUtcToLocalTime(value: string | Date | null | undefined): string {
    return formatUtcIsoAsLocalTimeDisplay(value);
}

/** UTC ISO → HTML `type="date"` (`yyyy-MM-dd`) — Europe/Istanbul duvar takvimi. */
export function toIstanbulDateInputValue(value: string | null | undefined): string {
    const d = parseUtcApiInstantIsoString(value);
    if (!d) {
        return '';
    }
    const p = getZonedWallParts(d.getTime(), DEFAULT_UTC_DISPLAY_TIME_ZONE);
    return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** UTC ISO → form saat (`HH:mm`) — Europe/Istanbul duvar saati. */
export function toIstanbulTimeInputValue(value: string | null | undefined): string {
    const d = parseUtcApiInstantIsoString(value);
    if (!d) {
        return '';
    }
    const p = getZonedWallParts(d.getTime(), DEFAULT_UTC_DISPLAY_TIME_ZONE);
    return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
}

/** UTC ISO → ayrı date + time form parçaları (Istanbul). */
export function toIstanbulDateTimeInputParts(value: string | null | undefined): { date: string; time: string } {
    return {
        date: toIstanbulDateInputValue(value),
        time: toIstanbulTimeInputValue(value)
    };
}

/** Istanbul `yyyy-MM-dd` + `HH:mm` → UTC ISO (`…000Z`). */
export function fromIstanbulDateAndTimeToUtcIso(date: string, time: string): string | null {
    const ms = utcMsFromIstanbulWallDateTime(date, time);
    if (ms === null) {
        return null;
    }
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

/** UTC ISO → HTML `datetime-local` (`yyyy-MM-ddTHH:mm`) — Europe/Istanbul. */
export function toIstanbulDateTimeLocalInputValue(value: string | null | undefined): string {
    const { date, time } = toIstanbulDateTimeInputParts(value);
    if (!date || !time) {
        return '';
    }
    return `${date}T${time}`;
}

/** `datetime-local` (`yyyy-MM-ddTHH:mm`, Istanbul duvar saati) → UTC ISO (`…000Z`). */
export function fromIstanbulDateTimeLocalInputToUtcIso(value: string | null | undefined): string | null {
    if (value == null || value === '') {
        return null;
    }
    let s = value.trim();
    if (!s) {
        return null;
    }
    if (s.includes(' ') && !s.includes('T')) {
        s = s.replace(' ', 'T');
    }
    const tIdx = s.indexOf('T');
    if (tIdx < 0) {
        return null;
    }
    const date = s.slice(0, tIdx);
    const timeMatch = s.slice(tIdx + 1).match(/^(\d{2}):(\d{2})/);
    if (!timeMatch) {
        return null;
    }
    return fromIstanbulDateAndTimeToUtcIso(date, `${timeMatch[1]}:${timeMatch[2]}`);
}

/** Yerel Date -> UTC ISO (`toISOString`) */
export function toUtcIsoFromLocalDate(value: Date | null | undefined): string | null {
    if (!value || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}

/**
 * API UTC anı → `datetime-local` (`yyyy-MM-ddTHH:mm`).
 * Tarayıcının **yerel** takvim/saat bileşenleri kullanılır; `dateTimeLocalInputToIsoUtc` ile çift kullanılmalıdır
 * (panel TR kiosku: tarayıcı saat dilimi Europe/Istanbul kabulü).
 */
export function utcIsoStringToDateTimeLocalInput(value: string | null | undefined): string {
    const d = parseUtcApiInstantIsoString(value);
    if (!d) {
        return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

/**
 * `datetime-local` girdisi (offset yok) → UTC ISO (`toISOString`).
 * Değer tarayıcı **yerel** saat diliminde yorumlanır; `utcIsoStringToDateTimeLocalInput` ile simetrik.
 */
export function dateTimeLocalInputToIsoUtc(localValue: string): string {
    if (!localValue?.trim()) {
        return '';
    }
    const d = new Date(localValue);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    return d.toISOString();
}

/** HTML `type="date"` (yyyy-MM-dd) → o günün **UTC takvim** gün başı (`Date.UTC`); tarayıcı/Istanbul değil. */
export function dateOnlyInputToUtcIso(dateStr: string): string {
    if (!dateStr?.trim()) {
        return '';
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) {
        return '';
    }
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
}

/** HTML `type="date"` (yyyy-MM-dd) → o günün **UTC takvim** gün sonu; tarayıcı/Istanbul değil. */
export function dateOnlyInputToUtcIsoEndOfDay(dateStr: string): string {
    if (!dateStr?.trim()) {
        return '';
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) {
        return '';
    }
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
}

function parseYyyyMmDd(dateStr: string): { y: number; m: number; d: number } | null {
    const t = dateStr.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) {
        return null;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d) || mo < 1 || mo > 12 || d < 1 || d > 31) {
        return null;
    }
    return { y, m: mo, d };
}

function addGregorianDaysToYmd(ymd: string, deltaDays: number): string | null {
    const p = parseYyyyMmDd(ymd);
    if (!p) {
        return null;
    }
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + deltaDays));
    if (Number.isNaN(dt.getTime())) {
        return null;
    }
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

type ZonedWallParts = { y: number; mo: number; d: number; h: number; mi: number; s: number; frac: number };

/** İlk UTC anı — `timeZone` yerelinde `targetYmd` + `HH:mm` duvar saati (saniye 0). */
function utcMsFromIstanbulWallDateTime(targetYmd: string, timeHm: string): number | null {
    const parsed = parseYyyyMmDd(targetYmd);
    if (!parsed) {
        return null;
    }
    const tm = timeHm.trim().match(/^(\d{2}):(\d{2})$/);
    if (!tm) {
        return null;
    }
    const th = Number(tm[1]);
    const tmi = Number(tm[2]);
    if (!Number.isFinite(th) || !Number.isFinite(tmi) || th < 0 || th > 23 || tmi < 0 || tmi > 59) {
        return null;
    }
    const ty = parsed.y;
    const tmo = parsed.m;
    const td = parsed.d;

    const atOrAfterTarget = (utcMs: number): boolean => {
        const p = getZonedWallParts(utcMs, DEFAULT_UTC_DISPLAY_TIME_ZONE);
        if (p.y !== ty) {
            return p.y > ty;
        }
        if (p.mo !== tmo) {
            return p.mo > tmo;
        }
        if (p.d !== td) {
            return p.d > td;
        }
        if (p.h !== th) {
            return p.h > th;
        }
        if (p.mi !== tmi) {
            return p.mi > tmi;
        }
        if (p.s !== 0) {
            return p.s > 0;
        }
        return p.frac >= 0;
    };

    let lo = Date.UTC(parsed.y, parsed.m - 1, parsed.d - 2, 12, 0, 0, 0);
    let hi = Date.UTC(parsed.y, parsed.m - 1, parsed.d + 2, 12, 0, 0, 0);
    if (!atOrAfterTarget(hi)) {
        return null;
    }
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (atOrAfterTarget(mid)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

function getZonedWallParts(utcMs: number, timeZone: string): ZonedWallParts {
    const f = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        fractionalSecondDigits: 3
    });
    const parts = f.formatToParts(new Date(utcMs));
    const get = (type: Intl.DateTimeFormatPartTypes): number => {
        const hit = parts.find((x) => x.type === type);
        return hit ? Number(hit.value) : 0;
    };
    const fracRaw = parts.find((x) => x.type === 'fractionalSecond')?.value;
    const frac = fracRaw !== undefined && fracRaw !== '' ? Number(fracRaw) : 0;
    return {
        y: get('year'),
        mo: get('month'),
        d: get('day'),
        h: get('hour'),
        mi: get('minute'),
        s: get('second'),
        frac: Number.isFinite(frac) ? frac : 0
    };
}

/** İlk UTC anı (epoch ms) — `timeZone` yerelinde `targetYmd` günü 00:00:00.000 veya sonrası. */
function firstUtcInstantOnOrAfterIstanbulCalendarDayStart(targetYmd: string): number | null {
    const parsed = parseYyyyMmDd(targetYmd);
    if (!parsed) {
        return null;
    }
    const ty = parsed.y;
    const tm = parsed.m;
    const td = parsed.d;

    const atOrAfterDayStart = (utcMs: number): boolean => {
        const p = getZonedWallParts(utcMs, REPORT_FILTER_TIME_ZONE);
        if (p.y !== ty) {
            return p.y > ty;
        }
        if (p.mo !== tm) {
            return p.mo > tm;
        }
        if (p.d !== td) {
            return p.d > td;
        }
        if (p.h !== 0) {
            return p.h > 0;
        }
        if (p.mi !== 0) {
            return p.mi > 0;
        }
        if (p.s !== 0) {
            return p.s > 0;
        }
        return p.frac >= 0;
    };

    let lo = Date.UTC(parsed.y, parsed.m - 1, parsed.d - 2, 12, 0, 0, 0);
    let hi = Date.UTC(parsed.y, parsed.m - 1, parsed.d + 2, 12, 0, 0, 0);
    if (!atOrAfterDayStart(hi)) {
        return null;
    }
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (atOrAfterDayStart(mid)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

/**
 * `type="date"` (`yyyy-MM-dd`) → seçilen günün **Europe/Istanbul** takvim günü başı (00:00:00.000) UTC ISO anı.
 * Örn. `2026-05-12` → `2026-05-11T21:00:00.000Z` (TR yaz saati yok; +03).
 */
export function dateOnlyInputToIstanbulStartUtcIso(ymd: string): string {
    const ms = firstUtcInstantOnOrAfterIstanbulCalendarDayStart(ymd);
    return ms === null ? '' : new Date(ms).toISOString();
}

/**
 * `type="date"` (`yyyy-MM-dd`) → seçilen günün **Europe/Istanbul** takvim günü sonu (23:59:59.999) UTC ISO anı.
 * Örn. `2026-05-12` → `2026-05-12T20:59:59.999Z`
 */
export function dateOnlyInputToIstanbulEndUtcIso(ymd: string): string {
    const nextYmd = addGregorianDaysToYmd(ymd, 1);
    if (!nextYmd) {
        return '';
    }
    const nextStart = firstUtcInstantOnOrAfterIstanbulCalendarDayStart(nextYmd);
    return nextStart === null ? '' : new Date(nextStart - 1).toISOString();
}

/** Dosya adı damgası: `yyyyMMdd-HHmm` (ör. `stok-durumu-20260509-1430.csv`). */
export function localDateTimeYyyyMmDd_HHmmForFileName(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}${m}${day}-${h}${min}`;
}
