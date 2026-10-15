import { TestBed } from '@angular/core/testing';
import { KvkkConsentFormDocumentComponent } from './kvkk-consent-form-document.component';

describe('KvkkConsentFormDocumentComponent', () => {
    const render = (inputs: { template: string; clinicName?: string; clientName?: string; date?: string }) => {
        const fixture = TestBed.createComponent(KvkkConsentFormDocumentComponent);

        fixture.componentRef.setInput('template', inputs.template);
        fixture.componentRef.setInput('clinicName', inputs.clinicName ?? '');
        fixture.componentRef.setInput('clientName', inputs.clientName ?? '');
        fixture.componentRef.setInput('date', inputs.date ?? '');
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('başlıkta klinik adı, doldurulmuş metin, Kabul/Kabul etmiyorum kutuları ve Veri Sahibi bloğu', () => {
        const el = render({ template: '{{clientName}} — {{clinicName}}\n{{date}}', clinicName: 'Pati Kliniği', clientName: 'Ali Veli', date: '15.10.2026' });

        expect(el.querySelector('[data-testid="kvkk-form-clinic"]')?.textContent).toContain('Pati Kliniği');
        expect(el.querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Ali Veli — Pati Kliniği\n15.10.2026');
        const choices = el.querySelector('[data-testid="kvkk-form-choices"]')?.textContent ?? '';

        expect(choices).toContain('Kabul ediyorum');
        expect(choices).toContain('Kabul etmiyorum');
        const signature = el.querySelector('[data-testid="kvkk-form-signature"]')?.textContent ?? '';

        for (const part of ['Veri Sahibi', 'Adı Soyadı', 'Ali Veli', 'Tarih', '15.10.2026', 'İmza']) {
            expect(signature).toContain(part);
        }
    });

    it('metin HTML olarak yorumlanmaz; klinik adı yoksa başlık çıkmaz', () => {
        const el = render({ template: '<b>kalın</b>' });

        expect(el.querySelector('b')).toBeNull();
        expect(el.querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('<b>kalın</b>');
        expect(el.querySelector('[data-testid="kvkk-form-clinic"]')).toBeNull();
    });
});
