const DEFAULT_LOCALE = 'tr-TR';
const DEFAULT_UTC_DISPLAY_TIME_ZONE = 'Europe/Istanbul';

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

/** Yerel Date -> UTC ISO (`toISOString`) */
export function toUtcIsoFromLocalDate(value: Date | null | undefined): string | null {
    if (!value || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}

/** GET `paidAtUtc` → `datetime-local` (yerel saat bileşenleri). */
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

/** HTML `datetime-local` değerini ISO UTC stringe çevirir (form gönderimi için). */
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

/** HTML `type="date"` (yyyy-MM-dd) → gün başı UTC ISO (API sözleşmesine göre ayarlanabilir). */
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

/** HTML `type="date"` (yyyy-MM-dd) → gün sonu UTC ISO (`paidToUtc` dahil aralık için). */
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
