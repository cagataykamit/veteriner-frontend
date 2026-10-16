import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicTopbarComponent, PUBLIC_NAV_LINKS } from './public-topbar.component';

describe('PublicTopbarComponent', () => {
    const setup = () => {
        TestBed.configureTestingModule({ imports: [PublicTopbarComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(PublicTopbarComponent);

        fixture.detectChanges();
        const host: HTMLElement = fixture.nativeElement;
        const menuButton = host.querySelector<HTMLButtonElement>('button[aria-controls="public-mobile-menu"]')!;

        return { fixture, host, menuButton };
    };

    const flush = async (fixture: { detectChanges: () => void }) => {
        await new Promise((r) => setTimeout(r, 0));
        fixture.detectChanges();
    };

    afterEach(() => {
        document.body.style.overflow = '';
    });

    it('tema düğmelerinin erişilebilir adı dolu, menü düğmesi kapalı başlar', () => {
        const { host, menuButton } = setup();
        const toggles = Array.from(host.querySelectorAll('button.public-topbar-theme-toggle'));

        expect(toggles.length).toBe(2);
        toggles.forEach((b) => expect(b.getAttribute('aria-label')).toBe('Koyu temaya geç'));
        expect(menuButton.getAttribute('aria-expanded')).toBe('false');
        expect(host.querySelector('#public-mobile-menu')).toBeNull();
    });

    it('"İçeriğe atla" bağlantısı ana içeriğe odaklanır', () => {
        const { host } = setup();
        const main = document.createElement('main');

        main.id = 'icerik';
        document.body.appendChild(main);

        try {
            host.querySelector<HTMLAnchorElement>('a.public-skip-link')!.click();

            expect(main.getAttribute('tabindex')).toBe('-1');
            expect(document.activeElement).toBe(main);
        } finally {
            main.remove();
        }
    });

    it('hamburger menüyü açar: aria-expanded, tüm bağlantılar, odak kapatma düğmesinde, kaydırma kilitli', async () => {
        const { fixture, host, menuButton } = setup();

        menuButton.click();
        fixture.detectChanges();
        await flush(fixture);

        const menu = host.querySelector<HTMLElement>('#public-mobile-menu')!;

        expect(menuButton.getAttribute('aria-expanded')).toBe('true');
        expect(menu.getAttribute('role')).toBe('dialog');
        expect(Array.from(menu.querySelectorAll('nav a')).map((a) => a.textContent?.trim())).toEqual(PUBLIC_NAV_LINKS.map((l) => l.label));
        expect(document.activeElement).toBe(menu.querySelector('button[aria-label="Menüyü kapat"]'));
        expect(document.body.style.overflow).toBe('hidden');
    });

    it('Escape menüyü kapatır ve odağı hamburger düğmesine döndürür', async () => {
        const { fixture, host, menuButton } = setup();

        menuButton.click();
        fixture.detectChanges();
        await flush(fixture);
        host.querySelector<HTMLElement>('#public-mobile-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();

        expect(host.querySelector('#public-mobile-menu')).toBeNull();
        expect(menuButton.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(menuButton);
        expect(document.body.style.overflow).toBe('');
    });

    it('Tab son öğeden ilk öğeye, Shift+Tab ilk öğeden son öğeye döner (odak tuzağı)', async () => {
        const { fixture, host, menuButton } = setup();

        menuButton.click();
        fixture.detectChanges();
        await flush(fixture);
        const menu = host.querySelector<HTMLElement>('#public-mobile-menu')!;
        const focusable = Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        last.focus();
        menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        expect(document.activeElement).toBe(first);

        menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
        expect(document.activeElement).toBe(last);
    });
});
