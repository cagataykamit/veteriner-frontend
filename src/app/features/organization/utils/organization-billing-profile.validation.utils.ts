import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import type { OrganizationBillingProfileFormFieldKey } from '@/app/features/organization/forms/organization-billing-profile-upsert-form.model';

/** Backend sözleşmesiyle uyumlu alan üst sınırları. */
export const ORG_BILLING_PROFILE_FIELD_MAX = {
    companyName: 200,
    legalCompanyName: 200,
    taxOffice: 100,
    taxNumber: 11,
    companyPhone: 50,
    invoiceProvince: 80,
    invoiceDistrict: 80,
    invoiceNeighborhood: 120,
    invoiceStreet: 160,
    invoiceBuildingName: 120,
    invoiceBuildingNo: 20,
    invoiceDoorNo: 20
} as const satisfies Record<OrganizationBillingProfileFormFieldKey, number>;

const ORG_BILLING_PROFILE_FIELD_MIN = {
    legalCompanyName: 2,
    taxOffice: 2,
    invoiceProvince: 2,
    invoiceDistrict: 2,
    invoiceNeighborhood: 2,
    invoiceStreet: 2,
    invoiceBuildingName: 2
} as const satisfies Partial<Record<OrganizationBillingProfileFormFieldKey, number>>;

const REQUIRED_FIELDS = new Set<OrganizationBillingProfileFormFieldKey>([
    'legalCompanyName',
    'taxOffice',
    'taxNumber',
    'companyPhone',
    'invoiceProvince',
    'invoiceDistrict',
    'invoiceNeighborhood',
    'invoiceStreet',
    'invoiceBuildingNo',
    'invoiceDoorNo'
]);

const MIN_LENGTH_FIELDS = new Set<OrganizationBillingProfileFormFieldKey>([
    'legalCompanyName',
    'taxOffice',
    'invoiceProvince',
    'invoiceDistrict',
    'invoiceNeighborhood',
    'invoiceStreet'
]);

const DIGIT_REQUIRED_FIELDS = new Set<OrganizationBillingProfileFormFieldKey>(['invoiceBuildingNo', 'invoiceDoorNo']);

export const ORG_BILLING_PROFILE_FIELD_MAP: Record<string, OrganizationBillingProfileFormFieldKey> = {
    companyname: 'companyName',
    legalcompanyname: 'legalCompanyName',
    taxoffice: 'taxOffice',
    taxnumber: 'taxNumber',
    companyphone: 'companyPhone',
    invoiceprovince: 'invoiceProvince',
    invoicedistrict: 'invoiceDistrict',
    invoiceneighborhood: 'invoiceNeighborhood',
    invoicestreet: 'invoiceStreet',
    invoicebuildingname: 'invoiceBuildingName',
    invoicebuildingno: 'invoiceBuildingNo',
    invoicedoorno: 'invoiceDoorNo'
};

export function trimmedRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value;
        if (typeof v !== 'string' || !v.trim().length) {
            return { required: true };
        }
        return null;
    };
}

export function trimmedMinLength(min: number): ValidatorFn {
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

export function optionalTrimmedMinLength(min: number): ValidatorFn {
    return trimmedMinLength(min);
}

export function taxNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        if (typeof raw !== 'string' || !raw.trim()) {
            return { required: true };
        }
        const digits = raw.trim();
        if (!/^\d+$/.test(digits)) {
            return { taxNumberDigits: true };
        }
        if (digits.length !== 10 && digits.length !== 11) {
            return { taxNumberLength: true };
        }
        return null;
    };
}

/** 05XXXXXXXXX, 5XXXXXXXXX, +905XXXXXXXXX, 905XXXXXXXXX */
export function isValidTurkishCompanyPhone(raw: string): boolean {
    const v = raw.trim();
    if (!v) {
        return false;
    }
    if (/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(v)) {
        return false;
    }
    const digits = v.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('5')) {
        return true;
    }
    if (digits.length === 11 && digits.startsWith('05')) {
        return true;
    }
    if (digits.length === 12 && digits.startsWith('905')) {
        return true;
    }
    return false;
}

export function turkishCompanyPhoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        if (typeof raw !== 'string' || !raw.trim()) {
            return { required: true };
        }
        if (!isValidTurkishCompanyPhone(raw)) {
            return { phoneInvalid: true };
        }
        return null;
    };
}

export function mustContainDigitValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        if (typeof raw !== 'string' || !raw.trim()) {
            return null;
        }
        if (!/\d/.test(raw)) {
            return { mustContainDigit: true };
        }
        return null;
    };
}

export function billingProfileFieldValidators(field: OrganizationBillingProfileFormFieldKey): ValidatorFn[] {
    const max = ORG_BILLING_PROFILE_FIELD_MAX[field];
    const validators: ValidatorFn[] = [Validators.maxLength(max)];

    if (REQUIRED_FIELDS.has(field)) {
        validators.push(trimmedRequired());
    }

    if (MIN_LENGTH_FIELDS.has(field)) {
        validators.push(trimmedMinLength(ORG_BILLING_PROFILE_FIELD_MIN[field as keyof typeof ORG_BILLING_PROFILE_FIELD_MIN]!));
    }

    if (field === 'invoiceBuildingName') {
        validators.push(optionalTrimmedMinLength(ORG_BILLING_PROFILE_FIELD_MIN.invoiceBuildingName));
    }

    if (field === 'taxNumber') {
        return [taxNumberValidator(), Validators.maxLength(max)];
    }

    if (field === 'companyPhone') {
        return [turkishCompanyPhoneValidator(), Validators.maxLength(max)];
    }

    if (DIGIT_REQUIRED_FIELDS.has(field)) {
        validators.push(mustContainDigitValidator());
    }

    return validators;
}

export function billingProfileFieldErrorMessage(
    field: OrganizationBillingProfileFormFieldKey,
    errors: ValidationErrors | null
): string | null {
    if (!errors) {
        return null;
    }
    if (typeof errors['server'] === 'string' && errors['server'].trim()) {
        return errors['server'].trim();
    }
    if (errors['required']) {
        return 'Bu alan zorunludur.';
    }
    if (errors['trimmedMinLength']) {
        return 'En az 2 karakter olmalıdır.';
    }
    if (errors['maxlength']) {
        return `En fazla ${ORG_BILLING_PROFILE_FIELD_MAX[field]} karakter olabilir.`;
    }
    if (field === 'taxNumber') {
        if (errors['taxNumberDigits']) {
            return 'Vergi numarası sadece rakam içermelidir.';
        }
        if (errors['taxNumberLength']) {
            return 'Vergi numarası 10 veya 11 haneli olmalıdır.';
        }
    }
    if (field === 'companyPhone' && errors['phoneInvalid']) {
        return 'Geçerli bir telefon numarası girin.';
    }
    if (field === 'invoiceBuildingNo' && errors['mustContainDigit']) {
        return 'Bina no en az bir rakam içermelidir.';
    }
    if (field === 'invoiceDoorNo' && errors['mustContainDigit']) {
        return 'Kapı no en az bir rakam içermelidir.';
    }
    return null;
}

/** Vergi numarası alanında yalnızca rakam kalacak şekilde normalize eder. */
export function sanitizeTaxNumberValue(value: string): string {
    return value.replace(/\D/g, '');
}
