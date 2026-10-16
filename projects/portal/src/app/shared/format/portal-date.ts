/** Klinik saat dilimi; tarihler hasta sahibine İstanbul günüyle gösterilir (ADR-028). */
const PORTAL_TIME_ZONE = 'Europe/Istanbul';

const DATE_FORMAT = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: PORTAL_TIME_ZONE });
const DAY_FORMAT = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: PORTAL_TIME_ZONE });
const TIME_FORMAT = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: PORTAL_TIME_ZONE });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: PORTAL_TIME_ZONE });

/** `…Utc` alanı UTC'dir; sözleşme §6 gereği `Z` soneki olmayabilir, bu durumda UTC kabul edilir. */
export function parsePortalUtc(value: string): Date | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
    const date = new Date(hasZone ? trimmed : `${trimmed}Z`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatUtc(utc: string | null | undefined, format: Intl.DateTimeFormat): string {
    const date = utc ? parsePortalUtc(utc) : null;

    return date ? format.format(date) : '';
}

/** "16 Ekim 2026" biçimi; geçersiz değerde boş metin. */
export function formatPortalDate(utc: string | null | undefined): string {
    return formatUtc(utc, DATE_FORMAT);
}

/** UTC anın İstanbul günü, "gg.aa.yyyy"; geçersiz değerde boş metin. */
export function formatPortalDay(utc: string | null | undefined): string {
    return formatUtc(utc, DAY_FORMAT);
}

/** UTC anın İstanbul saati, "SS:dd". */
export function formatPortalTime(utc: string | null | undefined): string {
    return formatUtc(utc, TIME_FORMAT);
}

/** UTC anın İstanbul'daki gün adı, ör. "Pazartesi". */
export function formatPortalWeekday(utc: string | null | undefined): string {
    return formatUtc(utc, WEEKDAY_FORMAT);
}

/** Takvim tarihi (`yyyy-MM-dd`, saat dilimsiz) → "gg.aa.yyyy"; saat dilimi dönüşümü yapılmaz. */
export function formatPortalCalendarDate(value: string | null | undefined): string {
    const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim()) : null;

    return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}

/** Saat (`HH:mm:ss`) → "SS:dd". */
export function formatPortalClock(value: string | null | undefined): string {
    const match = value ? /^(\d{2}):(\d{2})/.exec(value.trim()) : null;

    return match ? `${match[1]}:${match[2]}` : '';
}
