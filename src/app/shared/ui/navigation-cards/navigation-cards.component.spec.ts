import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CardEntry } from '@/app/core/routing/panel-navigation';
import { NavigationCardsComponent } from './navigation-cards.component';

describe('NavigationCardsComponent', () => {
    const entries: CardEntry[] = [
        { label: 'Ödeme Raporu', icon: 'pi pi-wallet', route: '/panel/reports/payments', description: 'Tahsilatlar.' },
        { label: 'Randevu Raporu', icon: 'pi pi-calendar', route: '/panel/reports/appointments', description: 'Randevular.' }
    ];

    function create(favoriteRoutes: ReadonlySet<string> | null) {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(NavigationCardsComponent);

        fixture.componentRef.setInput('entries', entries);
        fixture.componentRef.setInput('favoriteRoutes', favoriteRoutes);
        fixture.detectChanges();

        return fixture;
    }

    it('favori girdisi yoksa yıldız düğmesi yok (Ayarlar, Tanımlar)', () => {
        const el: HTMLElement = create(null).nativeElement;

        expect(el.querySelectorAll('a.card').length).toBe(2);
        expect(el.querySelector('[data-testid="favorite-toggle"]')).toBeNull();
    });

    it('favori durumu düğmede görünür; tıklama kartın adresini yayar ve bağlantıyı açmaz', () => {
        const fixture = create(new Set(['/panel/reports/payments']));
        const emitted: string[] = [];

        fixture.componentInstance.favoriteToggle.subscribe((r) => emitted.push(r));
        const [first, second] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-testid="favorite-toggle"]'));

        expect(first.getAttribute('aria-pressed')).toBe('true');
        expect(first.getAttribute('aria-label')).toBe('Favorilerden çıkar: Ödeme Raporu');
        expect(second.getAttribute('aria-pressed')).toBe('false');
        expect(first.closest('a')).toBeNull();

        second.click();

        expect(emitted).toEqual(['/panel/reports/appointments']);
    });
});
