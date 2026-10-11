import type { ValidationErrors, ValidatorFn } from '@angular/forms';

/** Sözleşme sınırları (`CHARGES_API_CONTRACT.md` §1). */
export const CHARGE_DESCRIPTION_MAX_LENGTH = 500;
export const CHARGE_QUANTITY_MAX = 100000;
export const CHARGE_QUANTITY_MAX_DECIMALS = 3;
export const CHARGE_UNIT_PRICE_MAX = 10000000;
export const CHARGE_UNIT_PRICE_MAX_DECIMALS = 2;

const AMOUNT_DECIMALS = 2;

function scaled(value: number, decimals: number): bigint {
    return BigInt(Math.round(value * 10 ** decimals));
}

export function hasAtMostDecimals(value: number, decimals: number): boolean {
    const s = value * 10 ** decimals;
    return Math.abs(s - Math.round(s)) < 1e-6;
}

/**
 * Önizleme tutarı: `round(quantity × unitPrice, 2, AwayFromZero)` (sözleşmedeki kural; kayıtlı tutarı backend hesaplar).
 * Girdi geçersizse veya tutar sıfıra yuvarlanıyorsa `null`.
 */
export function computeChargeAmount(quantity: number | null, unitPrice: number | null): number | null {
    if (quantity == null || unitPrice == null || !(quantity > 0) || !(unitPrice > 0)) {
        return null;
    }
    if (
        !hasAtMostDecimals(quantity, CHARGE_QUANTITY_MAX_DECIMALS) ||
        !hasAtMostDecimals(unitPrice, CHARGE_UNIT_PRICE_MAX_DECIMALS)
    ) {
        return null;
    }
    // Tam sayı aritmetiği: ölçek 10^(3+2); sonuç 10^2 ölçeğine yarım-yukarı (pozitif => AwayFromZero) yuvarlanır.
    const product = scaled(quantity, CHARGE_QUANTITY_MAX_DECIMALS) * scaled(unitPrice, CHARGE_UNIT_PRICE_MAX_DECIMALS);
    const divisor = 10n ** BigInt(CHARGE_QUANTITY_MAX_DECIMALS + CHARGE_UNIT_PRICE_MAX_DECIMALS - AMOUNT_DECIMALS);
    const cents = (product + divisor / 2n) / divisor;
    return cents > 0n ? Number(cents) / 10 ** AMOUNT_DECIMALS : null;
}

/** Pozitif, üst sınırlı ve en fazla `decimals` ondalıklı sayı; boş değer `required` ile yakalanır. */
export function chargeNumberValidator(max: number, decimals: number): ValidatorFn {
    return (control): ValidationErrors | null => {
        const v = control.value as number | null;
        if (v === null || v === undefined || (v as unknown) === '') {
            return null;
        }
        if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
            return { chargePositive: true };
        }
        if (v > max) {
            return { chargeMax: { max } };
        }
        return hasAtMostDecimals(v, decimals) ? null : { chargeDecimals: { decimals } };
    };
}
