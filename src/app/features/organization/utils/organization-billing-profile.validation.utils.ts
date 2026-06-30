import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import type { OrganizationBillingProfileFormFieldKey } from '@/app/features/organization/forms/organization-billing-profile-upsert-form.model';

/** Backend sözleşmesiyle uyumlu UX üst sınırları (authoritative validation backend’de). */
export const ORG_BILLING_PROFILE_FIELD_MAX = {
    companyName: 200,
    legalCompanyName: 200,
    taxOffice: 100,
    taxNumber: 11,
    companyPhone: 50,
    invoiceProvince: 64,
    invoiceDistrict: 64,
    invoiceNeighborhood: 128,
    invoiceStreet: 256,
    invoiceBuildingName: 128,
    invoiceBuildingNo: 16,
    invoiceDoorNo: 16
} as const satisfies Record<OrganizationBillingProfileFormFieldKey, number>;

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

export function optionalTaxNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value;
        if (typeof raw !== 'string' || !raw.trim()) {
            return null;
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

export function billingProfileFieldValidators(field: OrganizationBillingProfileFormFieldKey): ValidatorFn[] {
    const max = ORG_BILLING_PROFILE_FIELD_MAX[field];
    const validators: ValidatorFn[] = [Validators.maxLength(max)];
    if (field === 'taxNumber') {
        validators.push(optionalTaxNumberValidator());
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
    if (errors['maxlength']) {
        return `En fazla ${ORG_BILLING_PROFILE_FIELD_MAX[field]} karakter olabilir.`;
    }
    if (field === 'taxNumber') {
        if (errors['taxNumberDigits']) {
            return 'Vergi numarası yalnızca rakam içermelidir.';
        }
        if (errors['taxNumberLength']) {
            return 'Vergi numarası 10 veya 11 haneli olmalıdır.';
        }
    }
    return null;
}
