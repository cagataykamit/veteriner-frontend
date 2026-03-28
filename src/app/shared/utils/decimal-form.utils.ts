/**
 * Form alanlarında ondalık için yaygın girdi (virgül veya nokta) → finite sayı.
 * İş kuralı katmanında tekrarlanan `trim` + `replace` + `Number` zincirini tekilleştirir.
 */
export function parseDecimalFormInput(input: string): number | null {
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
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) && !Number.isNaN(value) ? value : null;
    }
    return parseDecimalFormInput(String(value));
}

/** Form patch / `input[type=number]` string beklediğinde. */
export function amountToFormString(value: string | number | null | undefined): string {
    const n = parseAmountFormValue(value);
    return n != null ? String(n) : '';
}
