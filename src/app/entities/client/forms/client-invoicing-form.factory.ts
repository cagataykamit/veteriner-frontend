import { FormBuilder, Validators } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { ClientInvoicingIdentityDto, ClientPersonType } from '@/app/entities/client/models/client-api.model';
import { nationalIdValidator, taxpayerIdentityValidator } from '@/app/shared/utils/turkish-tax-identity.utils';

/** Sözleşme üst sınırları (`INVOICING_IDENTITY_API_CONTRACT.md` §2). */
export const CLIENT_INVOICING_MAX = {
    taxOffice: 100,
    legalName: 300,
    billingProvince: 80,
    billingDistrict: 80,
    billingAddressLine: 500
} as const;

/** Müşteri formunun "Fatura bilgileri" bölümü; tüm alanlar isteğe bağlı. */
export interface ClientInvoicingFormValue {
    personType: ClientPersonType | null;
    nationalId: string;
    taxNumber: string;
    taxOffice: string;
    legalName: string;
    billingProvince: string;
    billingDistrict: string;
    billingAddressLine: string;
}

export type ClientInvoicingFieldKey = Exclude<keyof ClientInvoicingFormValue, 'personType'>;

export type ClientInvoicingFormGroup = FormGroup<{
    [K in keyof ClientInvoicingFormValue]: FormControl<ClientInvoicingFormValue[K]>;
}>;

export function createClientInvoicingFormGroup(fb: FormBuilder): ClientInvoicingFormGroup {
    const form = fb.nonNullable.group({
        personType: fb.control<ClientPersonType | null>(null),
        nationalId: fb.nonNullable.control('', [nationalIdValidator()]),
        // Kurumsal vergi numarası: 10 haneli VKN ya da şahıs şirketinde 11 haneli TCKN.
        taxNumber: fb.nonNullable.control('', [taxpayerIdentityValidator()]),
        taxOffice: fb.nonNullable.control('', [Validators.maxLength(CLIENT_INVOICING_MAX.taxOffice)]),
        legalName: fb.nonNullable.control('', [Validators.maxLength(CLIENT_INVOICING_MAX.legalName)]),
        billingProvince: fb.nonNullable.control('', [Validators.maxLength(CLIENT_INVOICING_MAX.billingProvince)]),
        billingDistrict: fb.nonNullable.control('', [Validators.maxLength(CLIENT_INVOICING_MAX.billingDistrict)]),
        billingAddressLine: fb.nonNullable.control('', [Validators.maxLength(CLIENT_INVOICING_MAX.billingAddressLine)])
    }) as ClientInvoicingFormGroup;

    // Kişi türü değişince gizlenen alanlar boşalır: görünmeyen geçersiz değer kaydı engellemesin, gövdeye de girmesin.
    // Abonelik formun kendi denetimine bağlıdır; form ile birlikte yok olur.
    form.controls.personType.valueChanges.subscribe((type) => {
        const c = form.controls;

        if (type !== 'Individual') {
            c.nationalId.setValue('');
        }

        if (type !== 'Corporate') {
            c.taxNumber.setValue('');
            c.taxOffice.setValue('');
            c.legalName.setValue('');
        }
    });

    return form;
}

const trimmedOrNull = (v: string): string | null => (v.trim() ? v.trim() : null);

/**
 * Form → gövde (tam değiştirme). Kişi türüne göre gizlenen alanlar boşaltılır: bireyselde VKN/vergi dairesi/unvan,
 * kurumsalda TCKN, tür yokken kimlik/vergi alanlarının hepsi (sunucu tutarsız birleşimi reddeder).
 */
export function mapClientInvoicingFormToDto(value: ClientInvoicingFormValue): ClientInvoicingIdentityDto {
    const type = value.personType;
    const individual = type === 'Individual';
    const corporate = type === 'Corporate';

    return {
        personType: type,
        nationalId: individual ? trimmedOrNull(value.nationalId) : null,
        taxNumber: corporate ? trimmedOrNull(value.taxNumber) : null,
        taxOffice: corporate ? trimmedOrNull(value.taxOffice) : null,
        legalName: corporate ? trimmedOrNull(value.legalName) : null,
        billingProvince: trimmedOrNull(value.billingProvince),
        billingDistrict: trimmedOrNull(value.billingDistrict),
        billingAddressLine: trimmedOrNull(value.billingAddressLine)
    };
}

export function mapClientInvoicingDtoToFormValue(dto: ClientInvoicingIdentityDto | null | undefined): ClientInvoicingFormValue {
    return {
        personType: dto?.personType === 'Individual' || dto?.personType === 'Corporate' ? dto.personType : null,
        nationalId: dto?.nationalId ?? '',
        taxNumber: dto?.taxNumber ?? '',
        taxOffice: dto?.taxOffice ?? '',
        legalName: dto?.legalName ?? '',
        billingProvince: dto?.billingProvince ?? '',
        billingDistrict: dto?.billingDistrict ?? '',
        billingAddressLine: dto?.billingAddressLine ?? ''
    };
}

/** Gövde boş mu (yeni kayıtta hiç doldurulmadıysa alan gönderilmez). */
export function isClientInvoicingDtoEmpty(dto: ClientInvoicingIdentityDto): boolean {
    return Object.values(dto).every((v) => v == null);
}
