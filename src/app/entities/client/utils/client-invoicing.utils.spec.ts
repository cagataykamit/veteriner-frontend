import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { mapClientDetailDtoToVm, mapCreateClientToApiBody } from '@/app/entities/client/data/client.mapper';
import { createClientInvoicingFormGroup, isClientInvoicingDtoEmpty, mapClientInvoicingDtoToFormValue, mapClientInvoicingFormToDto } from '@/app/entities/client/forms/client-invoicing-form.factory';
import { clientInvoicingFieldErrorMessage, formatClientInvoicingSummary, mapClientInvoicingSummaryDtoToVm, parseClientInvoicingFieldErrors } from '@/app/entities/client/utils/client-invoicing.utils';

describe('client-invoicing (ADR-036)', () => {
    const fb = new FormBuilder();

    it('form → gövde: kişi türüne göre gizlenen alanlar gönderilmez', () => {
        const base = mapClientInvoicingDtoToFormValue(null);

        expect(mapClientInvoicingFormToDto({ ...base, personType: 'Individual', nationalId: ' 10000000146 ', taxNumber: '1234567890', billingProvince: ' İzmir ' })).toEqual({
            personType: 'Individual',
            nationalId: '10000000146',
            taxNumber: null,
            taxOffice: null,
            legalName: null,
            billingProvince: 'İzmir',
            billingDistrict: null,
            billingAddressLine: null
        });

        const corporate = mapClientInvoicingFormToDto({ ...base, personType: 'Corporate', nationalId: '10000000146', taxNumber: '1234567890', legalName: 'Örnek' });

        expect(corporate.nationalId).toBeNull();
        expect(corporate.taxNumber).toBe('1234567890');
        expect(corporate.legalName).toBe('Örnek');

        const none = mapClientInvoicingFormToDto({ ...base, nationalId: '10000000146' });

        expect(isClientInvoicingDtoEmpty(none)).toBe(true);
    });

    it('form: TCKN/VKN doğrulanır, tür değişince gizlenen alan boşalır', () => {
        const form = createClientInvoicingFormGroup(fb);

        form.controls.personType.setValue('Individual');
        form.controls.nationalId.setValue('12345678901');
        expect(form.invalid).toBe(true);
        expect(clientInvoicingFieldErrorMessage('nationalId', form.controls.nationalId.errors)).toBe('TCKN 11 haneli ve geçerli olmalıdır.');

        form.controls.personType.setValue('Corporate');
        expect(form.controls.nationalId.value).toBe('');
        expect(form.valid).toBe(true);

        form.controls.taxNumber.setValue('1234567891');
        expect(clientInvoicingFieldErrorMessage('taxNumber', form.controls.taxNumber.errors)).toBe('Geçerli bir VKN (10 hane) veya TCKN (11 hane) girin.');

        // Şahıs şirketi: vergi numarası olarak TCKN.
        form.controls.taxNumber.setValue('10000000146');
        expect(form.controls.taxNumber.valid).toBe(true);
        form.controls.taxNumber.setValue('12345678901');
        expect(form.controls.taxNumber.valid).toBe(false);
    });

    it('kart satırı: kurumsal vergi numarası 11 haneliyse TCKN etiketiyle maskeli gösterilir', () => {
        const vm = mapClientInvoicingSummaryDtoToVm({ personType: 'Corporate', taxNumberMasked: '100******46', legalName: 'Ayşe Yılmaz' })!;

        expect(formatClientInvoicingSummary(vm)).toBe('Kurumsal · Ayşe Yılmaz · TCKN 100******46');
    });

    it('detay: maskeli özet; boşsa null', () => {
        expect(mapClientInvoicingSummaryDtoToVm({ personType: null, nationalIdMasked: ' ' })).toBeNull();
        expect(mapClientDetailDtoToVm({ id: 'c1', tenantId: 't1' }).invoicing).toBeNull();

        const vm = mapClientDetailDtoToVm({
            id: 'c1',
            tenantId: 't1',
            invoicing: { personType: 'Individual', nationalIdMasked: '100******46', billingDistrict: 'Kadıköy', billingProvince: 'İstanbul', billingAddressLine: 'Moda Cad. 1' }
        }).invoicing!;

        expect(formatClientInvoicingSummary(vm)).toBe('Bireysel · TCKN 100******46 · Moda Cad. 1, Kadıköy / İstanbul');
    });

    it('gövde: invoicingIdentity yalnız verildiğinde girer (PUT: yok = dokunma)', () => {
        expect('invoicingIdentity' in mapCreateClientToApiBody({ fullName: 'Ali' })).toBe(false);

        const identity = mapClientInvoicingFormToDto({ ...mapClientInvoicingDtoToFormValue(null), personType: 'Individual', nationalId: '10000000146' });

        expect(mapCreateClientToApiBody({ fullName: 'Ali', invoicingIdentity: identity }).invoicingIdentity).toEqual(identity);
    });

    it('sunucunun InvoicingIdentity.* alan hataları bölüm alanlarına eşlenir', () => {
        const err = new HttpErrorResponse({
            status: 400,
            error: { errors: { 'InvoicingIdentity.NationalId': ['TCKN 11 haneli ve geçerli olmalıdır.'], FullName: ['x'] } }
        });

        expect(parseClientInvoicingFieldErrors(err)).toEqual({ nationalId: 'TCKN 11 haneli ve geçerli olmalıdır.' });
    });
});
