import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppMenu } from './app.menu';

describe('AppMenu', () => {
    const rail = signal(false);
    let counts: Record<string, number | null>;

    const create = (hasClaim: (claim: string) => boolean = () => true): ComponentFixture<AppMenu> => {
        TestBed.configureTestingModule({
            imports: [AppMenu],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: AuthService, useValue: { hasOperationClaim: hasClaim } },
                { provide: LayoutService, useValue: { isMenuRail: rail, layoutState: signal({ activePath: null }) } },
                { provide: MenuBadgeService, useValue: { count: (key: string) => counts[key] ?? null, connect: () => undefined } }
            ]
        });
        const fixture = TestBed.createComponent(AppMenu);
        fixture.detectChanges();
        return fixture;
    };

    const root = (fixture: ComponentFixture<AppMenu>) => fixture.nativeElement as HTMLElement;
    const labels = (fixture: ComponentFixture<AppMenu>) =>
        Array.from(root(fixture).querySelectorAll('.layout-menuitem-text')).map((el) => el.textContent?.trim());
    const link = (fixture: ComponentFixture<AppMenu>, label: string) =>
        Array.from(root(fixture).querySelectorAll('a')).find((a) => a.querySelector('.layout-menuitem-text')?.textContent?.trim() === label)!;
    const badges = (fixture: ComponentFixture<AppMenu>) =>
        Array.from(root(fixture).querySelectorAll('.layout-menuitem-badge')).map((el) => el.firstChild?.textContent);

    beforeEach(() => {
        localStorage.clear();
        rail.set(false);
        counts = {};
    });

    afterEach(() => localStorage.clear());

    it('menü iş akışı sırasındaki düz listedir: grup başlığı ve ayırıcı yoktur', () => {
        const fixture = create();
        expect(labels(fixture)).toEqual(['Bugün', 'Özet', 'Hastalar', 'Randevular', 'Para', 'Stok', 'Kayıtlar', 'Raporlar', 'Ayarlar']);
        expect(root(fixture).querySelector('.layout-menu-group-toggle')).toBeNull();
        expect(root(fixture).querySelector('.layout-menu-divider')).toBeNull();
    });

    it('simge şeridinde aynı öğeler görünür ve her biri tek bağlantıdır; simge ve ad aynı tıklanabilir satırın içindedir', () => {
        rail.set(true);
        const fixture = create();
        expect(labels(fixture)).toContain('Kayıtlar');
        const items = Array.from(root(fixture).querySelectorAll('li[app-menuitem]'));
        expect(items.length).toBe(9);
        for (const li of items) {
            const links = li.querySelectorAll('a');
            expect(links.length).toBe(1);
            expect(links[0].querySelector('.layout-menuitem-icon')).not.toBeNull();
            expect(links[0].querySelector('.layout-menuitem-text')?.textContent?.trim()).toBeTruthy();
        }
    });

    it('izinsiz sekme görünmez: bağlantı yetkili ilk sekmeye gider, hiç yetkili sekme yoksa öğe çıkmaz', () => {
        const fixture = create((claim) => claim === 'Pets.Read');
        expect(labels(fixture)).toEqual(['Hastalar', 'Ayarlar']);
        expect(link(fixture, 'Hastalar').getAttribute('href')).toBe('/panel/pets');
    });

    it('tüm sekmeler yetkiliyse bağlantı ilk sekmeye gider', () => {
        expect(link(create(), 'Hastalar').getAttribute('href')).toBe('/panel/clients');
    });

    it('öğe, sekmelerinden herhangi birindeki sayfada vurgulanır', async () => {
        const fixture = create();
        await TestBed.inject(Router).navigateByUrl('/panel/pets?clientId=c1');
        fixture.detectChanges();
        expect(link(fixture, 'Hastalar').classList).toContain('active-route');
        expect(link(fixture, 'Hastalar').getAttribute('aria-current')).toBe('page');
        expect(link(fixture, 'Randevular').classList).not.toContain('active-route');

        await TestBed.inject(Router).navigateByUrl('/panel/administrations');
        fixture.detectChanges();
        expect(link(fixture, 'Kayıtlar').classList).toContain('active-route');
        expect(link(fixture, 'Hastalar').classList).not.toContain('active-route');
    });

    it('sayaç bekleyen sayıyı gösterir; 0 gizli, 99 üstü 99+; Kayıtlar sayacının metni neyi saydığını söyler', () => {
        counts = { waitingVisits: 3, requestedLabResults: 250 };
        const fixture = create();
        expect(badges(fixture)).toEqual(['3', '99+']);
        expect(link(fixture, 'Kayıtlar').querySelector('.sr-only')?.textContent?.trim()).toBe('sonuç bekleyen lab istemi');
        expect(link(fixture, 'Bugün').querySelector('.sr-only')?.textContent?.trim()).toBe('bekleyen');

        counts = { waitingVisits: 0, requestedLabResults: null };
        const hidden = TestBed.createComponent(AppMenu);
        hidden.detectChanges();
        expect(badges(hidden)).toEqual([]);
    });
});
