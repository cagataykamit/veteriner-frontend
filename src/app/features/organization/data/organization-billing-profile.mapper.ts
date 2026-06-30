import type { OrganizationBillingProfileUpsertFormValue } from '@/app/features/organization/forms/organization-billing-profile-upsert-form.model';
import type {
    OrganizationBillingProfile,
    OrganizationBillingProfileUpdateRequest
} from '@/app/features/organization/models/organization-billing-profile.model';

function nullableTrimmed(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

export function mapOrganizationBillingProfileToFormValue(
    profile: OrganizationBillingProfile
): OrganizationBillingProfileUpsertFormValue {
    return {
        companyName: profile.companyName?.trim() ?? '',
        legalCompanyName: profile.legalCompanyName?.trim() ?? '',
        taxOffice: profile.taxOffice?.trim() ?? '',
        taxNumber: profile.taxNumber?.trim() ?? '',
        companyPhone: profile.companyPhone?.trim() ?? '',
        invoiceProvince: profile.invoiceProvince?.trim() ?? '',
        invoiceDistrict: profile.invoiceDistrict?.trim() ?? '',
        invoiceNeighborhood: profile.invoiceNeighborhood?.trim() ?? '',
        invoiceStreet: profile.invoiceStreet?.trim() ?? '',
        invoiceBuildingName: profile.invoiceBuildingName?.trim() ?? '',
        invoiceBuildingNo: profile.invoiceBuildingNo?.trim() ?? '',
        invoiceDoorNo: profile.invoiceDoorNo?.trim() ?? ''
    };
}

export function mapOrganizationBillingProfileFormValueToUpdateRequest(
    value: OrganizationBillingProfileUpsertFormValue
): OrganizationBillingProfileUpdateRequest {
    return {
        companyName: nullableTrimmed(value.companyName),
        legalCompanyName: nullableTrimmed(value.legalCompanyName),
        taxOffice: nullableTrimmed(value.taxOffice),
        taxNumber: nullableTrimmed(value.taxNumber),
        companyPhone: nullableTrimmed(value.companyPhone),
        invoiceProvince: nullableTrimmed(value.invoiceProvince),
        invoiceDistrict: nullableTrimmed(value.invoiceDistrict),
        invoiceNeighborhood: nullableTrimmed(value.invoiceNeighborhood),
        invoiceStreet: nullableTrimmed(value.invoiceStreet),
        invoiceBuildingName: nullableTrimmed(value.invoiceBuildingName),
        invoiceBuildingNo: nullableTrimmed(value.invoiceBuildingNo),
        invoiceDoorNo: nullableTrimmed(value.invoiceDoorNo)
    };
}
