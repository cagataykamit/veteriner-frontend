import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Portal form kuralları. Parola kuralı backend `StrongPasswordRules` ile aynıdır (sözleşme §3: en az 8, en fazla 128;
 * büyük/küçük harf, rakam, özel karakter); sunucu yine doğrular. Klinik panelindeki `password-policy.util.ts`'ten
 * kopyalanıp sadeleştirildi (portal panel kodunu içe aktarmaz) ve metinler "parola" diliyle yazıldı.
 */
export const PORTAL_PASSWORD_MIN_LENGTH = 8;
export const PORTAL_PASSWORD_MAX_LENGTH = 128;
export const PORTAL_DISPLAY_NAME_MAX_LENGTH = 100;
export const PORTAL_EMAIL_MAX_LENGTH = 256;

export const PORTAL_PASSWORD_HINT = 'En az 8 karakter; büyük harf, küçük harf, rakam ve özel karakter içermeli.';

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const DIGIT = /\d/;
/** Backend ile uyumlu: kelime karakteri ve boşluk dışındaki karakterler. */
const SPECIAL = /[^\w\s]/;
const ONE_TIME_CODE = /^\d{6}$/;

export function portalStrongPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (typeof value !== 'string' || value === '') {
            return null;
        }

        const errors: ValidationErrors = {};

        if (value.length < PORTAL_PASSWORD_MIN_LENGTH) errors['minlength'] = true;
        if (value.length > PORTAL_PASSWORD_MAX_LENGTH) errors['maxlength'] = true;
        if (!UPPERCASE.test(value)) errors['missingUppercase'] = true;
        if (!LOWERCASE.test(value)) errors['missingLowercase'] = true;
        if (!DIGIT.test(value)) errors['missingDigit'] = true;
        if (!SPECIAL.test(value)) errors['missingSpecialChar'] = true;

        return Object.keys(errors).length > 0 ? errors : null;
    };
}

/** 6 haneli tek kullanımlık kod (sözleşme §3). Aradaki boşluklar kabul edilir, gönderimde atılır. */
export function portalOneTimeCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = typeof control.value === 'string' ? normalizeOneTimeCode(control.value) : '';

        return value === '' || ONE_TIME_CODE.test(value) ? null : { oneTimeCode: true };
    };
}

export function normalizeOneTimeCode(value: string): string {
    return value.replace(/\s+/g, '');
}

export const portalEmailValidators: ValidatorFn[] = [Validators.required, Validators.email, Validators.maxLength(PORTAL_EMAIL_MAX_LENGTH)];

/** Grup doğrulayıcı: iki parola alanı aynı olmalı. */
export function portalPasswordsMatch(passwordKey: string, confirmKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const password = group.get(passwordKey)?.value;
        const confirm = group.get(confirmKey)?.value;

        return typeof confirm === 'string' && confirm.length > 0 && password !== confirm ? { passwordMismatch: true } : null;
    };
}

/** Alan hata kodu → Türkçe mesaj (ilk uygun hata). */
export function portalFieldError(errors: ValidationErrors | null | undefined, field: 'email' | 'password' | 'code' | 'displayName'): string | null {
    if (!errors) {
        return null;
    }

    if (errors['required']) {
        return field === 'email' ? 'E-posta adresinizi girin.' : field === 'code' ? 'E-postanıza gelen kodu girin.' : 'Parolanızı girin.';
    }

    if (field === 'email' && (errors['email'] || errors['maxlength'])) return 'Geçerli bir e-posta adresi girin.';
    if (field === 'code' && errors['oneTimeCode']) return 'Kod 6 haneli bir sayı olmalı.';
    if (field === 'displayName' && errors['maxlength']) return `Ad en fazla ${PORTAL_DISPLAY_NAME_MAX_LENGTH} karakter olabilir.`;
    if (errors['minlength']) return 'Parola en az 8 karakter olmalı.';
    if (errors['maxlength']) return 'Parola en fazla 128 karakter olabilir.';
    if (errors['missingUppercase']) return 'Parola en az bir büyük harf içermeli.';
    if (errors['missingLowercase']) return 'Parola en az bir küçük harf içermeli.';
    if (errors['missingDigit']) return 'Parola en az bir rakam içermeli.';
    if (errors['missingSpecialChar']) return 'Parola en az bir özel karakter içermeli.';

    return null;
}

export const PORTAL_PASSWORD_MISMATCH_MESSAGE = 'Parolalar aynı olmalı.';
