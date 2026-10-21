import type { HttpErrorResponse } from '@angular/common/http';
import type { ValidationErrors } from '@angular/forms';
import type { ClientInvoicingSummaryDto, ClientPersonType } from '@/app/features/clients/models/client-api.model';
import type { ClientInvoicingSummaryVm } from '@/app/features/clients/models/client-vm.model';
import { CLIENT_INVOICING_MAX, type ClientInvoicingFieldKey } from '@/app/features/clients/forms/client-invoicing-form.factory';
import { TAX_IDENTITY_MSG_NATIONAL_ID, TAX_IDENTITY_MSG_TAX_NUMBER } from '@/app/shared/utils/turkish-tax-identity.utils';
import { parseValidationFieldErrors } from '@/app/shared/utils/validation-error-parse.utils';

export const CLIENT_PERSON_TYPE_OPTIONS: readonly { label: string; value: ClientPersonType | null }[] = [
    { label: 'Belirtilmemiş', value: null },
    { label: 'Bireysel', value: 'Individual' },
    { label: 'Kurumsal', value: 'Corporate' }
];

export function clientPersonTypeLabel(type: ClientPersonType | null): string {
    return CLIENT_PERSON_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Belirtilmemiş';
}

const textOrNull = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

/** Detay yanıtındaki maskeli fatura kimliği; hiçbir alan dolu değilse `null` (kartta satır gösterilmez). */
export function mapClientInvoicingSummaryDtoToVm(dto: ClientInvoicingSummaryDto | null | undefined): ClientInvoicingSummaryVm | null {
    if (!dto) {
        return null;
    }

    const vm: ClientInvoicingSummaryVm = {
        personType: dto.personType === 'Individual' || dto.personType === 'Corporate' ? dto.personType : null,
        nationalIdMasked: textOrNull(dto.nationalIdMasked),
        taxNumberMasked: textOrNull(dto.taxNumberMasked),
        taxOffice: textOrNull(dto.taxOffice),
        legalName: textOrNull(dto.legalName),
        billingProvince: textOrNull(dto.billingProvince),
        billingDistrict: textOrNull(dto.billingDistrict),
        billingAddressLine: textOrNull(dto.billingAddressLine)
    };

    return Object.values(vm).some((v) => v != null) ? vm : null;
}

/** Kart satırı: "Kurumsal · Örnek Ltd. · VKN 123*****90 · Kadıköy VD · Moda Cad. 1, Kadıköy / İstanbul". */
export function formatClientInvoicingSummary(vm: ClientInvoicingSummaryVm): string {
    const place = [vm.billingDistrict, vm.billingProvince].filter(Boolean).join(' / ');
    const address = [vm.billingAddressLine, place || null].filter(Boolean).join(', ');

    return [
        vm.personType ? clientPersonTypeLabel(vm.personType) : null,
        vm.legalName,
        vm.nationalIdMasked ? `TCKN ${vm.nationalIdMasked}` : null,
        vm.taxNumberMasked ? `VKN ${vm.taxNumberMasked}` : null,
        vm.taxOffice ? `${vm.taxOffice} VD` : null,
        address || null
    ]
        .filter(Boolean)
        .join(' · ');
}

export function clientInvoicingFieldErrorMessage(field: ClientInvoicingFieldKey, errors: ValidationErrors | null): string | null {
    if (!errors) {
        return null;
    }

    if (errors['nationalId']) {
        return TAX_IDENTITY_MSG_NATIONAL_ID;
    }

    if (errors['taxNumber']) {
        return TAX_IDENTITY_MSG_TAX_NUMBER;
    }

    if (errors['maxlength'] && field in CLIENT_INVOICING_MAX) {
        return `En fazla ${CLIENT_INVOICING_MAX[field as keyof typeof CLIENT_INVOICING_MAX]} karakter olabilir.`;
    }

    return null;
}

const API_FIELD_MAP: Record<string, ClientInvoicingFieldKey> = {
    invoicingidentitynationalid: 'nationalId',
    invoicingidentitytaxnumber: 'taxNumber',
    invoicingidentitytaxoffice: 'taxOffice',
    invoicingidentitylegalname: 'legalName',
    invoicingidentitybillingprovince: 'billingProvince',
    invoicingidentitybillingdistrict: 'billingDistrict',
    invoicingidentitybillingaddressline: 'billingAddressLine'
};

/** Sunucunun `InvoicingIdentity.*` alan hatalarını bölüm alanlarına eşler (sunucu mesajı Türkçedir). */
export function parseClientInvoicingFieldErrors(err: HttpErrorResponse): Partial<Record<ClientInvoicingFieldKey, string>> {
    return parseValidationFieldErrors<ClientInvoicingFieldKey>(err.error, { fieldMap: API_FIELD_MAP });
}
