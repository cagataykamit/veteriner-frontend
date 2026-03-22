const DEFAULT_LOCALE = 'tr-TR';

export function formatMoney(amount: number | null | undefined, currency = 'TRY', locale = DEFAULT_LOCALE): string {
    if (amount == null || Number.isNaN(amount)) {
        return '—';
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
