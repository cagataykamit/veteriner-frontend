import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CardEntry } from '@/app/core/routing/panel-navigation';
import { PLAN_LOCK_HINT, TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { NavigationCardsComponent } from './navigation-cards.component';

describe('NavigationCardsComponent', () => {
    const entries: CardEntry[] = [
        { label: 'Ödeme Raporu', icon: 'pi pi-wallet', route: '/panel/reports/payments', description: 'Tahsilatlar.' },
        { label: 'Randevu Raporu', icon: 'pi pi-calendar', route: '/panel/reports/appointments', description: 'Randevular.' }
    ];
    let locked: ReadonlySet<string> = new Set();

    function create(favoriteRoutes: ReadonlySet<string> | null, cardEntries: CardEntry[] = entries) {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: TenantReadOnlyContextService, useValue: { planLockHint: (f?: string) => (f && locked.has(f) ? PLAN_LOCK_HINT : null) } }]
        });
        const fixture = TestBed.createComponent(NavigationCardsComponent);

        fixture.componentRef.setInput('entries', cardEntries);
        fixture.componentRef.setInput('favoriteRoutes', favoriteRoutes);
        fixture.detectChanges();

        return fixture;
    }

    afterEach(() => {
        locked = new Set();
    });

    it('paket dışı kart kilit ve "Üst pakette" ile görünür, açılabilir kalır; paketteki kartta ipucu yok', () => {
        locked = new Set(['CashManagement']);
        const el: HTMLElement = create(null, [{ ...entries[0], planFeature: 'CashManagement' }, { ...entries[1], planFeature: 'Waitlist' }]).nativeElement;
        const [first, second] = Array.from(el.querySelectorAll('a.card'));

        expect(first.querySelector('[data-testid="plan-lock-hint"]')?.textContent?.trim()).toBe('Üst pakette');
        expect(first.getAttribute('href')).toBe('/panel/reports/payments');
        expect(second.querySelector('[data-testid="plan-lock-hint"]')).toBeNull();
    });

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
