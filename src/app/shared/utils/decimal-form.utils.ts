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
