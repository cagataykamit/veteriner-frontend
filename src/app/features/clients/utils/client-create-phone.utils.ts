import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const CLIENT_CREATE_PHONE_MSG_REQUIRED = 'Telefon numarası zorunludur.';

/** Yerel doğrulama: biçim / uzunluk / harf vb. */
export const CLIENT_CREATE_PHONE_MSG_INVALID =
    'Telefon numarası geçerli değil. Türkiye cep telefonu olarak 05XXXXXXXXX, 5XXXXXXXXX veya +90XXXXXXXXXX formatında girin.';

/**
 * Sadece rakamlar — 10 hane (5…), 11 hane (05…) veya 12 hane (905…).
 * Backend normalize edeceği için istemci yalın biçim kontrolü yapar.
 */
export function isValidTurkishMobileDigits(d: string): boolean {
    if (d.length === 10 && d.startsWith('5')) {
        return true;
    }
    if (d.length === 11 && d.startsWith('05')) {
        return true;
    }
    if (d.length === 12 && d.startsWith('905')) {
        return true;
    }
    return false;
}

/**
 * Türkiye cep telefonu için hafif yerel doğrulama (kaynak doğruluk backend).
 * - trim
 * - harf vb. yasak karakter
 * - anlamsız uzunluk / biçim (ör. 20+ rakam)
 */
export function turkishMobilePhoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = (control.value ?? '').toString();
        const v = raw.trim();

        if (v === '') {
            return { phoneRequired: true };
        }

        if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(v)) {
            return { phoneInvalidChars: true };
        }

        const d = v.replace(/\D/g, '');

        if (d.length > 12) {
            return { phoneInvalidFormat: true };
        }

        if (isValidTurkishMobileDigits(d)) {
            return null;
        }

        if (d.length < 10) {
            return { phoneInvalidFormat: true };
        }

        return { phoneInvalidFormat: true };
    };
}
