import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegalConsentCheckboxComponent } from './legal-consent-checkbox.component';

describe('LegalConsentCheckboxComponent', () => {
    let fixture: ComponentFixture<LegalConsentCheckboxComponent>;

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [LegalConsentCheckboxComponent] }).compileComponents();
        fixture = TestBed.createComponent(LegalConsentCheckboxComponent);
    });

    it('üç belgeye yeni sekmede açılan bağlantı ve tek cümle gösterir', () => {
        fixture.componentRef.setInput('documents', ['Terms', 'Privacy', 'DataProcessing']);
        fixture.detectChanges();

        const links = Array.from(host().querySelectorAll('a'));

        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/kullanim-sartlari', '/gizlilik', '/veri-isleme-sozlesmesi']);
        expect(links.every((a) => a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener')).toBeTrue();
        expect(host().querySelector('label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'Kullanım Şartları, Gizlilik Politikası ve Veri İşleme Sözleşmesi metinlerini okudum ve kabul ediyorum.'
        );
    });

    it('iki belgede "ve" ile birleştirir', () => {
        fixture.componentRef.setInput('documents', ['Terms', 'Privacy']);
        fixture.detectChanges();

        expect(host().querySelector('label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'Kullanım Şartları ve Gizlilik Politikası metinlerini okudum ve kabul ediyorum.'
        );
    });

    it('kutu tıklanınca checked modeli değişir', () => {
        fixture.componentRef.setInput('documents', ['Terms']);
        fixture.detectChanges();

        const input = host().querySelector<HTMLInputElement>('input[type="checkbox"]');

        expect(fixture.componentInstance.checked()).toBeFalse();
        input?.click();
        fixture.detectChanges();

        expect(fixture.componentInstance.checked()).toBeTrue();
    });
});
