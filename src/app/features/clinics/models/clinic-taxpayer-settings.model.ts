/** Kliniğin mükellef türü (ADR-036 AK-3); `null` = belirtilmemiş. */
export type ClinicTaxpayerType = 'SelfEmployed' | 'Company' | 'Both';

/** `GET/PUT /clinics/{id}/taxpayer-settings` yanıtı (`INVOICING_IDENTITY_API_CONTRACT.md` §3). */
export interface ClinicTaxpayerSettingsDto {
    clinicId: string;
    /** Kayıt yoksa `false`; varsayılan KDV %20 döner. */
    isConfigured: boolean;
    taxpayerType: ClinicTaxpayerType | null;
    /** VKN (10) veya TCKN (11); yalnız klinik yöneticileri okur. */
    taxIdentityNumber: string | null;
    taxOffice: string | null;
    taxpayerName: string | null;
    province: string | null;
    district: string | null;
    addressLine: string | null;
    defaultVatRate: number;
    withholdingRate: number | null;
    updatedAtUtc: string | null;
}

/** PUT gövdesi (tam değiştirme). */
export type UpdateClinicTaxpayerSettingsRequestDto = Omit<ClinicTaxpayerSettingsDto, 'clinicId' | 'isConfigured' | 'updatedAtUtc'>;

export interface ClinicTaxpayerSettingsFormValue {
    taxpayerType: ClinicTaxpayerType | null;
    taxIdentityNumber: string;
    taxOffice: string;
    taxpayerName: string;
    province: string;
    district: string;
    addressLine: string;
    defaultVatRate: number | null;
    withholdingRate: number | null;
}
