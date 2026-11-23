import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicAuthShellComponent } from './public-auth-shell.component';

@Component({
    standalone: true,
    imports: [PublicAuthShellComponent],
    template: `<app-public-auth-shell [wide]="wide"><p class="icerik">Kart içeriği</p></app-public-auth-shell>`
})
class HostComponent {
    wide = false;
}

describe('PublicAuthShellComponent (L-01 A)', () => {
    const render = (wide: boolean) => {
        TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentInstance.wide = wide;
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('üst şeritte logo ve Ana sayfa bağlantısı, ortada kart, kartın altında hukuki bağlantılar', () => {
        const el = render(false);
        const homeLinks = Array.from(el.querySelectorAll('.public-auth-topbar a')).map((a) => [a.getAttribute('href'), a.textContent?.trim()]);

        expect(el.querySelector('.public-auth-page')?.className).toContain('public-site');
        expect(homeLinks).toEqual([
            ['/', ''],
            ['/', 'Ana sayfa']
        ]);
        expect(el.querySelector('.public-auth-topbar-logo')?.getAttribute('aria-label')).toBe('Vetinity ana sayfa');
        expect(el.querySelector('.public-auth-card .icerik')?.textContent).toBe('Kart içeriği');
        expect(el.querySelector('.public-auth-card')?.classList).not.toContain('public-auth-card--wide');
        expect(el.querySelector('.public-auth-card + app-public-legal-links nav')).not.toBeNull();
    });

    it('geniş kart (kayıt)', () => {
        expect(render(true).querySelector('.public-auth-card')?.classList).toContain('public-auth-card--wide');
    });
});
