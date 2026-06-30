import { FormBuilder } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { OrganizationBillingProfileUpsertFormValue } from '@/app/features/organization/forms/organization-billing-profile-upsert-form.model';
import { billingProfileFieldValidators } from '@/app/features/organization/utils/organization-billing-profile.validation.utils';

export type OrganizationBillingProfileUpsertFormGroup = FormGroup<{
    [K in keyof OrganizationBillingProfileUpsertFormValue]: FormControl<OrganizationBillingProfileUpsertFormValue[K]>;
}>;

export function createOrganizationBillingProfileUpsertFormGroup(
    fb: FormBuilder
): OrganizationBillingProfileUpsertFormGroup {
    return fb.group({
        /** UI’da gösterilmez; GET/PUT sözleşmesinde korunur. */
        companyName: fb.nonNullable.control('', billingProfileFieldValidators('companyName')),
        legalCompanyName: fb.nonNullable.control('', billingProfileFieldValidators('legalCompanyName')),
        taxOffice: fb.nonNullable.control('', billingProfileFieldValidators('taxOffice')),
        taxNumber: fb.nonNullable.control('', billingProfileFieldValidators('taxNumber')),
        companyPhone: fb.nonNullable.control('', billingProfileFieldValidators('companyPhone')),
        invoiceProvince: fb.nonNullable.control('', billingProfileFieldValidators('invoiceProvince')),
        invoiceDistrict: fb.nonNullable.control('', billingProfileFieldValidators('invoiceDistrict')),
        invoiceNeighborhood: fb.nonNullable.control('', billingProfileFieldValidators('invoiceNeighborhood')),
        invoiceStreet: fb.nonNullable.control('', billingProfileFieldValidators('invoiceStreet')),
        invoiceBuildingName: fb.nonNullable.control('', billingProfileFieldValidators('invoiceBuildingName')),
        invoiceBuildingNo: fb.nonNullable.control('', billingProfileFieldValidators('invoiceBuildingNo')),
        invoiceDoorNo: fb.nonNullable.control('', billingProfileFieldValidators('invoiceDoorNo'))
    });
}

export function getOrganizationBillingProfileUpsertFormValue(
    form: OrganizationBillingProfileUpsertFormGroup
): OrganizationBillingProfileUpsertFormValue {
    return form.getRawValue();
}
