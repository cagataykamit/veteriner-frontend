const DEFAULT_LOCALE = 'tr-TR';

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
