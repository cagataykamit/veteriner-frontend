import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT =
    'En az 8 karakter; büyük harf, küçük harf, rakam ve özel karakter içermelidir.';

export const PASSWORD_POLICY_REQUIREMENT =
    'Şifreniz en az 8 karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermelidir.';

export const PASSWORD_ERROR_MESSAGES = {
    required: 'Şifre zorunludur.',
    minlength: 'Şifre en az 8 karakter olmalıdır.',
    missingUppercase: 'Şifre en az bir büyük harf içermelidir.',
    missingLowercase: 'Şifre en az bir küçük harf içermelidir.',
    missingDigit: 'Şifre en az bir rakam içermelidir.',
    missingSpecialChar: 'Şifre en az bir özel karakter içermelidir.',
    passwordMismatch: 'Şifreler eşleşmelidir.'
} as const;

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const DIGIT_PATTERN = /\d/;
/** Backend ile uyumlu: kelime karakteri ve boşluk dışındaki karakterler. */
const SPECIAL_CHAR_PATTERN = /[^\w\s]/;

export function getStrongPasswordValidationErrors(password: string): ValidationErrors | null {
    const errors: ValidationErrors = {};

    if (password.length < PASSWORD_MIN_LENGTH) {
        errors['minlength'] = { requiredLength: PASSWORD_MIN_LENGTH, actualLength: password.length };
    }
    if (!UPPERCASE_PATTERN.test(password)) {
        errors['missingUppercase'] = true;
    }
    if (!LOWERCASE_PATTERN.test(password)) {
        errors['missingLowercase'] = true;
    }
    if (!DIGIT_PATTERN.test(password)) {
        errors['missingDigit'] = true;
    }
    if (!SPECIAL_CHAR_PATTERN.test(password)) {
        errors['missingSpecialChar'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
}

export function strongPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (value == null || value === '') {
            return null;
        }
        if (typeof value !== 'string') {
            return null;
        }
        return getStrongPasswordValidationErrors(value);
    };
}

export function createStrongPasswordValidators(): ValidatorFn[] {
    return [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), strongPasswordValidator()];
}

export function getPasswordPolicyErrorMessage(errors: ValidationErrors | null | undefined): string | null {
    if (!errors) {
        return null;
    }
    if (errors['required']) {
        return PASSWORD_ERROR_MESSAGES.required;
    }
    if (errors['minlength']) {
        return PASSWORD_ERROR_MESSAGES.minlength;
    }
    if (errors['missingUppercase']) {
        return PASSWORD_ERROR_MESSAGES.missingUppercase;
    }
    if (errors['missingLowercase']) {
        return PASSWORD_ERROR_MESSAGES.missingLowercase;
    }
    if (errors['missingDigit']) {
        return PASSWORD_ERROR_MESSAGES.missingDigit;
    }
    if (errors['missingSpecialChar']) {
        return PASSWORD_ERROR_MESSAGES.missingSpecialChar;
    }
    return null;
}

export function validateStrongPasswordValue(password: string): string | null {
    if (!password) {
        return PASSWORD_ERROR_MESSAGES.required;
    }
    return getPasswordPolicyErrorMessage(getStrongPasswordValidationErrors(password));
}

export function passwordsMatchValidator(
    passwordKey = 'newPassword',
    confirmKey = 'confirmPassword'
): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const newPassword = group.get(passwordKey)?.value;
        const confirmPassword = group.get(confirmKey)?.value;
        if (typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
            return null;
        }
        if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
            return { passwordMismatch: true };
        }
        return null;
    };
}
