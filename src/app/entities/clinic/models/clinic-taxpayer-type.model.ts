/** Kliniğin mükellef türü (ADR-036 AK-3); `null` = belirtilmemiş. */
export type ClinicTaxpayerType = 'SelfEmployed' | 'Company' | 'Both';

/** Etiketler tek yerde: klinik mükellef bilgileri kartı ve e-Belge hazırlık listesi. */
export const CLINIC_TAXPAYER_TYPE_OPTIONS: readonly { label: string; value: ClinicTaxpayerType | null }[] = [
    { label: 'Belirtilmemiş', value: null },
    { label: 'Serbest meslek', value: 'SelfEmployed' },
    { label: 'Şirket', value: 'Company' },
    { label: 'İkisi (hizmet serbest meslek, ürün şirket)', value: 'Both' }
];
