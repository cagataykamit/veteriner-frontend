import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicLegalLinksComponent } from './public-legal-links.component';

describe('PublicLegalLinksComponent', () => {
    it('gizlilik politikası ve kullanım şartları bağlantılarını ayraçla gösterir', () => {
        TestBed.configureTestingModule({ imports: [PublicLegalLinksComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(PublicLegalLinksComponent);

        fixture.detectChanges();
        const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
        const links = Array.from(nav.querySelectorAll('a')).map((a) => [a.getAttribute('href'), a.textContent?.trim()]);

        expect(nav.getAttribute('aria-label')).toBe('Hukuki metinler');
        expect(links).toEqual([
            ['/gizlilik', 'Gizlilik Politikası'],
            ['/kullanim-sartlari', 'Kullanım Şartları']
        ]);
        expect(nav.textContent?.replace(/\s+/g, ' ').trim()).toBe('Gizlilik Politikası · Kullanım Şartları');
    });
});
