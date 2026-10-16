const formats = new Map<string, Intl.NumberFormat>();

function moneyFormat(currency: string): Intl.NumberFormat {
    let format = formats.get(currency);

    if (!format) {
        format = new Intl.NumberFormat('tr-TR', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
        formats.set(currency, format);
    }

    return format;
}

/** Tutar → "₺1.500,00" (Türkçe biçim). Para birimi boşsa TRY kabul edilir; geçersiz kodda sayı + kod yazılır. */
export function formatPortalMoney(amount: number, currency: string | null | undefined = 'TRY'): string {
    const code = (currency ?? '').trim().toUpperCase() || 'TRY';

    try {
        return moneyFormat(code).format(amount);
    } catch {
        return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
    }
}

/** Kilo → "4,2 kg". */
export function formatPortalWeight(kg: number | null | undefined): string {
    return kg === null || kg === undefined ? '' : `${kg.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`;
}
