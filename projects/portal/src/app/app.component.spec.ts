import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PortalAppComponent } from './app.component';
import { PORTAL_EMBEDDABLE, PORTAL_FRAMED } from './core/embed/portal-embed';

@Component({ selector: 'portal-test-page', standalone: true, template: '<p data-testid="page">sayfa</p>' })
class TestPage {}

describe('PortalAppComponent (çerçeve kuralı, APPT-021)', () => {
    async function render(framed: boolean, url: string): Promise<HTMLElement> {
        TestBed.configureTestingModule({
            imports: [PortalAppComponent],
            providers: [
                provideRouter([
                    { path: 'randevu/:bookingCode', data: { [PORTAL_EMBEDDABLE]: true }, component: TestPage },
                    { path: 'login', component: TestPage }
                ]),
                { provide: PORTAL_FRAMED, useValue: framed }
            ]
        });
        const fixture = TestBed.createComponent(PortalAppComponent);

        fixture.detectChanges();
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    it('çerçevede yalnız gömülebilir randevu sayfası çizilir', async () => {
        const el = await render(true, '/randevu/k7m2p9xq4r8t?kaynak=dis-site');

        expect(el.querySelector('[data-testid=page]')).not.toBeNull();
        expect(el.querySelector('[data-testid=frame-blocked]')).toBeNull();
    });

    it('çerçevede diğer sayfa içerik yerine yeni sekme bağlantısı gösterir', async () => {
        const el = await render(true, '/login');
        const link = el.querySelector<HTMLAnchorElement>('[data-testid=frame-blocked] a')!;

        expect(el.querySelector('[data-testid=page]')).toBeNull();
        expect(link.getAttribute('href')).toBe('/login');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('çerçeve dışında her sayfa olağan çizilir', async () => {
        const el = await render(false, '/login');

        expect(el.querySelector('[data-testid=page]')).not.toBeNull();
        expect(el.querySelector('[data-testid=frame-blocked]')).toBeNull();
    });
});
