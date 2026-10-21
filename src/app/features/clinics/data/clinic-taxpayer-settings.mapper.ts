import type {
    ClinicTaxpayerSettingsDto,
    ClinicTaxpayerSettingsFormValue,
    ClinicTaxpayerType,
    UpdateClinicTaxpayerSettingsRequestDto
} from '@/app/features/clinics/models/clinic-taxpayer-settings.model';

export const CLINIC_TAXPAYER_TYPE_OPTIONS: readonly { label: string; value: ClinicTaxpayerType | null }[] = [
    { label: 'Belirtilmemiş', value: null },
    { label: 'Serbest meslek', value: 'SelfEmployed' },
    { label: 'Şirket', value: 'Company' },
    { label: 'İkisi (hizmet serbest meslek, ürün şirket)', value: 'Both' }
];

/** Sözleşme üst sınırları (`INVOICING_IDENTITY_API_CONTRACT.md` §3). */
export const CLINIC_TAXPAYER_MAX = {
    taxOffice: 100,
    taxpayerName: 300,
    province: 80,
    district: 80,
    addressLine: 500
} as const;

export function mapClinicTaxpayerSettingsToFormValue(dto: ClinicTaxpayerSettingsDto): ClinicTaxpayerSettingsFormValue {
    return {
        taxpayerType: dto.taxpayerType ?? null,
        taxIdentityNumber: dto.taxIdentityNumber ?? '',
        taxOffice: dto.taxOffice ?? '',
        taxpayerName: dto.taxpayerName ?? '',
        province: dto.province ?? '',
        district: dto.district ?? '',
        addressLine: dto.addressLine ?? '',
        defaultVatRate: dto.defaultVatRate ?? null,
        withholdingRate: dto.withholdingRate ?? null
    };
}

const trimmedOrNull = (v: string): string | null => (v.trim() ? v.trim() : null);

export function mapClinicTaxpayerFormToPutBody(value: ClinicTaxpayerSettingsFormValue): UpdateClinicTaxpayerSettingsRequestDto {
    return {
        taxpayerType: value.taxpayerType,
        taxIdentityNumber: trimmedOrNull(value.taxIdentityNumber),
        taxOffice: trimmedOrNull(value.taxOffice),
        taxpayerName: trimmedOrNull(value.taxpayerName),
        province: trimmedOrNull(value.province),
        district: trimmedOrNull(value.district),
        addressLine: trimmedOrNull(value.addressLine),
        defaultVatRate: value.defaultVatRate as number,
        withholdingRate: value.withholdingRate
    };
}
