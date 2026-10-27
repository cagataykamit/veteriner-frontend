import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { createClientInvoicingFormGroup } from '@/app/entities/client/forms/client-invoicing-form.factory';
import { ClientInvoicingFieldsComponent } from './client-invoicing-fields.component';

describe('ClientInvoicingFieldsComponent', () => {
    const render = () => {
        TestBed.configureTestingModule({ imports: [ClientInvoicingFieldsComponent] });
        const form = createClientInvoicingFormGroup(new FormBuilder());
        const fixture = TestBed.createComponent(ClientInvoicingFieldsComponent);

        fixture.componentRef.setInput('form', form);
        fixture.detectChanges();

        return { fixture, form, el: fixture.nativeElement as HTMLElement };
    };

    it('kişi türüne göre TCKN ya da VKN/vergi dairesi/unvan gösterir', () => {
        const { fixture, form, el } = render();

        expect(el.querySelector('[data-testid="client-invoicing-section"]')?.textContent).toContain('Fatura bilgileri');
        expect(el.querySelector('#invoicingNationalId')).toBeNull();
        expect(el.querySelector('#invoicingTaxNumber')).toBeNull();

        form.controls.personType.setValue('Individual');
        fixture.detectChanges();
        expect(el.querySelector('#invoicingNationalId')).not.toBeNull();
        expect(el.querySelector('#invoicingTaxNumber')).toBeNull();

        form.controls.personType.setValue('Corporate');
        fixture.detectChanges();
        expect(el.querySelector('#invoicingNationalId')).toBeNull();
        expect(el.querySelector('#invoicingTaxNumber')).not.toBeNull();
        expect(el.querySelector('#invoicingTaxOffice')).not.toBeNull();
        expect(el.querySelector('#invoicingLegalName')).not.toBeNull();
    });

    it('geçersiz TCKN için Türkçe hata mesajı', () => {
        const { fixture, form, el } = render();

        form.controls.personType.setValue('Individual');
        form.controls.nationalId.setValue('12345678901');
        form.controls.nationalId.markAsTouched();
        fixture.detectChanges();

        expect(el.querySelector('[data-testid="invoicing-error-nationalId"]')?.textContent).toContain('TCKN 11 haneli ve geçerli olmalıdır.');
    });

    it('kurumsal vergi no alanı 11 haneye kadar alır; şahıs şirketi TCKN geçerli, hatalısı uyarılır', () => {
        const { fixture, form, el } = render();

        form.controls.personType.setValue('Corporate');
        fixture.detectChanges();
        expect(el.querySelector('#invoicingTaxNumber')?.getAttribute('maxlength')).toBe('11');

        form.controls.taxNumber.setValue('10000000146');
        form.controls.taxNumber.markAsTouched();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="invoicing-error-taxNumber"]')).toBeNull();

        form.controls.taxNumber.setValue('10000000147');
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="invoicing-error-taxNumber"]')?.textContent).toContain('VKN (10 hane) veya TCKN (11 hane)');
    });
});
