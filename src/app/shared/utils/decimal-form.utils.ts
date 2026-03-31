/**
 * Form alanlarında ondalık için yaygın girdi (virgül veya nokta) → finite sayı.
 * `input[type=number]` bazen `number`, boşta `null` dönebildiği için string dışı tipler güvenli işlenir.
 */
export function parseDecimalFormInput(input: string | number | null | undefined): number | null {
    if (input === null || input === undefined) {
        return null;
    }
    if (typeof input === 'number') {
        return Number.isFinite(input) && !Number.isNaN(input) ? input : null;
    }
    const t = input.trim();
    if (t === '') {
        return null;
    }
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
}

/**
 * Tutar alanı: `type="number"` bazen `number`, preload bazen `string` döndürür; güvenli parse.
 */
export function parseAmountFormValue(value: string | number | null | undefined): number | null {
    return parseDecimalFormInput(value);
}

/** Form patch / `input[type=number]` string beklediğinde. */
export function amountToFormString(value: string | number | null | undefined): string {
    const n = parseAmountFormValue(value);
    return n != null ? String(n) : '';
}
