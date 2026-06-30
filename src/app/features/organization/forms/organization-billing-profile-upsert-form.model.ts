export interface OrganizationBillingProfileUpsertFormValue {
    companyName: string;
    legalCompanyName: string;
    taxOffice: string;
    taxNumber: string;
    companyPhone: string;
    invoiceProvince: string;
    invoiceDistrict: string;
    invoiceNeighborhood: string;
    invoiceStreet: string;
    invoiceBuildingName: string;
    invoiceBuildingNo: string;
    invoiceDoorNo: string;
}

export type OrganizationBillingProfileFormFieldKey = keyof OrganizationBillingProfileUpsertFormValue;
