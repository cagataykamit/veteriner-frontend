/** Klinik saat dilimi; tarihler hasta sahibine İstanbul günüyle gösterilir. */
const PORTAL_TIME_ZONE = 'Europe/Istanbul';

const DATE_FORMAT = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: PORTAL_TIME_ZONE });

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

/** "16 Ekim 2026" biçimi; geçersiz değerde boş metin. */
export function formatPortalDate(utc: string | null | undefined): string {
    const date = utc ? parsePortalUtc(utc) : null;

    return date ? DATE_FORMAT.format(date) : '';
}
