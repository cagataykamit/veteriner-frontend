export interface OrganizationBillingProfile {
    companyName?: string | null;
    legalCompanyName?: string | null;
    taxOffice?: string | null;
    taxNumber?: string | null;
    companyPhone?: string | null;
    invoiceProvince?: string | null;
    invoiceDistrict?: string | null;
    invoiceNeighborhood?: string | null;
    invoiceStreet?: string | null;
    invoiceBuildingName?: string | null;
    invoiceBuildingNo?: string | null;
    invoiceDoorNo?: string | null;
}

export type OrganizationBillingProfileUpdateRequest = OrganizationBillingProfile;
