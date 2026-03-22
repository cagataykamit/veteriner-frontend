const DEFAULT_LOCALE = 'tr-TR';

/** Yerel takvim günü `yyyy-MM-dd` (liste API FromDate/ToDate ile uyumlu). */
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
