import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * TCKN / VKN resmî sağlama ve oran kuralları — backend `TurkishTaxIdentity` / `TaxRatePercent` ile aynı
 * (`docs/INVOICING_IDENTITY_API_CONTRACT.md` §1). Arayüz anında uyarı içindir; doğruluk kaynağı backend'dir.
 */

export const NATIONAL_ID_LENGTH = 11;
export const TAX_NUMBER_LENGTH = 10;

export const TAX_IDENTITY_MSG_NATIONAL_ID = 'TCKN 11 haneli ve geçerli olmalıdır.';
export const TAX_IDENTITY_MSG_TAXPAYER = 'Geçerli bir VKN (10 hane) veya TCKN (11 hane) girin.';
export const TAX_RATE_MSG_INVALID = 'Oran 0 ile 100 arasında ve en çok 2 ondalıklı olmalıdır.';

function digits(value: string | null | undefined, length: number): number[] | null {
    const text = value?.trim() ?? '';

    if (text.length !== length || !/^\d+$/.test(text)) {
        return null;
    }

    return [...text].map((ch) => ch.charCodeAt(0) - 48);
}

/** TCKN: 11 rakam, ilk hane 0 değil; 10. ve 11. hane sağlaması. */
export function isValidNationalId(value: string | null | undefined): boolean {
    const d = digits(value, NATIONAL_ID_LENGTH);

    if (!d || d[0] === 0) {
        return false;
    }

    const odd = d[0] + d[2] + d[4] + d[6] + d[8];
    const even = d[1] + d[3] + d[5] + d[7];
    const tenth = (((odd * 7 - even) % 10) + 10) % 10;
    const sum = d.slice(0, 10).reduce((a, b) => a + b, 0);

    return d[9] === tenth && d[10] === sum % 10;
}

/** VKN: 10 rakam; i = 1..9 için t = (dᵢ + 10 − i) mod 10, t = 9 ise 9 değilse (t × 2^(10 − i)) mod 9; kontrol (10 − toplam mod 10) mod 10. */
export function isValidTaxNumber(value: string | null | undefined): boolean {
    const d = digits(value, TAX_NUMBER_LENGTH);

    if (!d) {
        return false;
    }

    let sum = 0;

    for (let i = 1; i <= 9; i++) {
        const t = (d[i - 1] + 10 - i) % 10;

        sum += t === 9 ? 9 : (t * 2 ** (10 - i)) % 9;
    }

    return d[9] === (10 - (sum % 10)) % 10;
}

/** Mükellef kimliği: 10 hane VKN veya 11 hane TCKN. */
export function isValidTaxpayerIdentity(value: string | null | undefined): boolean {
    return isValidTaxNumber(value) || isValidNationalId(value);
}

export function isValidTaxRatePercent(value: number | null | undefined): boolean {
    return value == null || (value >= 0 && value <= 100 && Number(value.toFixed(2)) === value);
}

function optionalRule(rule: (v: string) => boolean, key: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = typeof control.value === 'string' ? control.value.trim() : '';

        return !v || rule(v) ? null : { [key]: true };
    };
}

/** Boş geçerli; doluysa TCKN sağlaması (`nationalId` hatası). */
export const nationalIdValidator = (): ValidatorFn => optionalRule(isValidNationalId, 'nationalId');

/** Boş geçerli; doluysa VKN veya TCKN (`taxpayerIdentity` hatası): klinik mükellef kimliği ve kurumsal müşteri vergi numarası. */
export const taxpayerIdentityValidator = (): ValidatorFn => optionalRule(isValidTaxpayerIdentity, 'taxpayerIdentity');

/** Boş geçerli; doluysa 0–100, en çok 2 ondalık (`taxRate` hatası). */
export function taxRateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value as number | null | undefined;

        return isValidTaxRatePercent(v) ? null : { taxRate: true };
    };
}
