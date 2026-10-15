import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import type { ClientCreateFormFieldKey } from '@/app/features/clients/utils/client-create-validation-parse.utils';
import {
    isValidTurkishMobileDigits,
    turkishMobilePhoneValidator
} from '@/app/features/clients/utils/client-create-phone.utils';

/** Backend sözleşmesi yoksa güvenli üst sınırlar. */
export const CLIENT_UPSERT_FIELD_MAX = {
    fullName: 200,
    email: 254,
    address: 500
} as const satisfies Partial<Record<ClientCreateFormFieldKey, number>>;

export const CLIENT_UPSERT_FULL_NAME_MIN = 2;

export const CLIENT_UPSERT_MSG_REQUIRED = 'Bu alan zorunludur.';
export const CLIENT_UPSERT_MSG_MIN_LENGTH = 'En az 2 karakter olmalıdır.';
export const CLIENT_UPSERT_MSG_PHONE_INVALID = 'Geçerli bir telefon numarası girin.';
export const CLIENT_UPSERT_MSG_EMAIL_INVALID = 'Geçerli bir e-posta adresi girin.';

export function clientUpsertMaxLengthMessage(field: ClientCreateFormFieldKey): string | null {
    const max = CLIENT_UPSERT_FIELD_MAX[field as keyof typeof CLIENT_UPSERT_FIELD_MAX];

    return max != null ? `En fazla ${max} karakter olabilir.` : null;
}

function trimmedRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value;

        if (typeof v !== 'string' || !v.trim().length) {
            return { required: true };
        }

        return null;
    };
}

function trimmedMinLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value;

        if (typeof v !== 'string') {
            return null;
        }

        const trimmed = v.trim();

        if (!trimmed.length) {
            return null;
        }

        if (trimmed.length < min) {
            return { trimmedMinLength: { requiredLength: min, actualLength: trimmed.length } };
        }

        return null;
    };
}

/** Doluysa e-posta biçimi; boş — geçerli. */
export function clientOptionalEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        const v = typeof raw === 'string' ? raw.trim() : '';

        if (!v) {
            return null;
        }

        return Validators.email(control);
    };
}

export function clientUpsertFieldValidators(field: ClientCreateFormFieldKey): ValidatorFn[] {
    switch (field) {
        case 'fullName':
            return [
                trimmedRequired(),
                trimmedMinLength(CLIENT_UPSERT_FULL_NAME_MIN),
                Validators.maxLength(CLIENT_UPSERT_FIELD_MAX.fullName)
            ];
        case 'phone':
            return [turkishMobilePhoneValidator()];
        case 'email':
            return [Validators.maxLength(CLIENT_UPSERT_FIELD_MAX.email), clientOptionalEmailValidator()];
        case 'address':
            return [Validators.maxLength(CLIENT_UPSERT_FIELD_MAX.address)];
        default:
            return [];
    }
}

export function clientUpsertFieldErrorMessage(
    field: ClientCreateFormFieldKey,
    errors: ValidationErrors | null
): string | null {
    if (!errors) {
        return null;
    }

    if (errors['required']) {
        return CLIENT_UPSERT_MSG_REQUIRED;
    }

    if (errors['trimmedMinLength']) {
        return CLIENT_UPSERT_MSG_MIN_LENGTH;
    }

    if (errors['maxlength']) {
        return clientUpsertMaxLengthMessage(field);
    }

    if (field === 'phone' && (errors['phoneInvalidChars'] || errors['phoneInvalidFormat'])) {
        return CLIENT_UPSERT_MSG_PHONE_INVALID;
    }

    if (field === 'email' && errors['email']) {
        return CLIENT_UPSERT_MSG_EMAIL_INVALID;
    }

    return null;
}

/** Test / yardımcı — telefon doğrulama mantığı tek kaynak. */
export { isValidTurkishMobileDigits };
