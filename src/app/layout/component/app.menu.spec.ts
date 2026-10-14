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

    /** Başlık ve öğe sırası: başlık "# Ad", öğe adı düz; simge şeridinde ayırıcı "—". */
    const outline = (fixture: ComponentFixture<AppMenu>) =>
        Array.from(root(fixture).querySelectorAll('.layout-menu-heading, .layout-menu-divider, li[app-menuitem]')).map((el) =>
            el.classList.contains('layout-menu-heading')
                ? `# ${el.textContent?.trim()}`
                : el.classList.contains('layout-menu-divider')
                  ? '—'
                  : el.querySelector('.layout-menuitem-text')?.textContent?.trim()
        );

    it('menü ADR-023 bölüm başlıklarıyla gruplanır; başlıklar açılıp kapanmaz, Yönetim bölümü alta sabittir', () => {
        const fixture = create();
        expect(outline(fixture)).toEqual([
            '# Günlük iş',
            'Bugün',
            'Randevular',
            '# Müşteri ve hasta',
            'Müşteri ve Hasta',
            '# Klinik',
            'Kayıtlar',
            '# Para ve stok',
            'Para',
            'Stok',
            '# Yönetim',
            'Raporlar',
            'Özet',
            'Ayarlar'
        ]);
        expect(root(fixture).querySelector('.layout-menu-group-toggle')).toBeNull();
        expect(root(fixture).querySelector('.layout-menu-divider')).toBeNull();
        const pinned = root(fixture).querySelector('.layout-menu-pinned')!;
        expect(pinned.querySelector('.layout-menu-heading')?.textContent?.trim()).toBe('Yönetim');
        expect(Array.from(pinned.querySelectorAll('.layout-menuitem-text')).map((el) => el.textContent?.trim())).toEqual(['Raporlar', 'Özet', 'Ayarlar']);
    });

    it('tüm girişleri izinle gizlenen bölümün başlığı da görünmez', () => {
        expect(outline(create((claim) => claim === 'Pets.Read'))).toEqual(['# Müşteri ve hasta', 'Müşteri ve Hasta', '# Yönetim', 'Ayarlar']);
    });

    it('simge şeridinde bölüm başlıkları yerine ince ayırıcı çıkar', () => {
        rail.set(true);
        const fixture = create();
        expect(root(fixture).querySelector('.layout-menu-heading')).toBeNull();
        expect(outline(fixture)).toEqual(['—', 'Bugün', 'Randevular', '—', 'Müşteri ve Hasta', '—', 'Kayıtlar', '—', 'Para', 'Stok', '—', 'Raporlar', 'Özet', 'Ayarlar']);
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
        const fixture = create((claim) => claim === 'StockMovements.Read');
        expect(labels(fixture)).toEqual(['Stok', 'Raporlar', 'Ayarlar']);
        expect(link(fixture, 'Stok').getAttribute('href')).toBe('/panel/stock-movements');
    });

    it('tüm sekmeler yetkiliyse bağlantı ilk sekmeye gider', () => {
        expect(link(create(), 'Müşteri ve Hasta').getAttribute('href')).toBe('/panel/patients');
    });

    it('öğe, sekmelerinden herhangi birindeki sayfada vurgulanır', async () => {
        const fixture = create();
        await TestBed.inject(Router).navigateByUrl('/panel/pets?clientId=c1');
        fixture.detectChanges();
        expect(link(fixture, 'Müşteri ve Hasta').classList).toContain('active-route');
        expect(link(fixture, 'Müşteri ve Hasta').getAttribute('aria-current')).toBe('page');
        expect(link(fixture, 'Randevular').classList).not.toContain('active-route');

        await TestBed.inject(Router).navigateByUrl('/panel/administrations');
        fixture.detectChanges();
        expect(link(fixture, 'Kayıtlar').classList).toContain('active-route');
        expect(link(fixture, 'Müşteri ve Hasta').classList).not.toContain('active-route');
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
