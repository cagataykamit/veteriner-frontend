import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppMenu } from './app.menu';

describe('AppMenu', () => {
    const rail = signal(false);
    let counts: Record<string, number | null>;

    const create = (hasClaim = true): ComponentFixture<AppMenu> => {
        TestBed.configureTestingModule({
            imports: [AppMenu],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: () => hasClaim } },
                { provide: LayoutService, useValue: { isMenuRail: rail, layoutState: signal({ activePath: null }) } },
                { provide: MenuBadgeService, useValue: { count: (key: string) => counts[key] ?? null, connect: () => undefined } }
            ]
        });
        const fixture = TestBed.createComponent(AppMenu);
        fixture.detectChanges();
        return fixture;
    };

    const text = (fixture: ComponentFixture<AppMenu>) => (fixture.nativeElement as HTMLElement).textContent ?? '';
    const badges = (fixture: ComponentFixture<AppMenu>) =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.layout-menuitem-badge')).map((el) => el.firstChild?.textContent);

    beforeEach(() => {
        localStorage.clear();
        rail.set(false);
        counts = {};
    });

    afterEach(() => localStorage.clear());

    it('açık kipte kapalı grubun öğeleri gizlidir, grup başlığı düğmedir', () => {
        localStorage.setItem('vetinity.menu.groups', JSON.stringify({ Stok: false }));
        const fixture = create();
        expect(text(fixture)).not.toContain('Stok hareketleri');
        expect(fixture.nativeElement.querySelector('.layout-menu-group-toggle')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.layout-menu-divider')).toBeNull();
    });

    it('simge şeridinde kapalı grupların öğeleri de görünür; başlıklar ayırıcı çizgiye döner', () => {
        localStorage.setItem('vetinity.menu.groups', JSON.stringify({ Stok: false }));
        rail.set(true);
        const fixture = create();
        expect(text(fixture)).toContain('Stok hareketleri');
        expect(text(fixture)).toContain('Bugün');
        expect(text(fixture)).toContain('Ayarlar');
        expect(fixture.nativeElement.querySelector('.layout-menu-group-toggle')).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('.layout-menu-divider[role="separator"]').length).toBe(3);
    });

    it('simge şeridinde her öğe tek bağlantıdır; simge ve ad aynı tıklanabilir satırın içindedir', () => {
        rail.set(true);
        const items = Array.from((create().nativeElement as HTMLElement).querySelectorAll('li[app-menuitem]'));
        expect(items.length).toBeGreaterThan(0);
        for (const li of items) {
            const links = li.querySelectorAll('a');
            expect(links.length).toBe(1);
            expect(links[0].querySelector('.layout-menuitem-icon')).not.toBeNull();
            expect(links[0].querySelector('.layout-menuitem-text')?.textContent?.trim()).toBeTruthy();
        }
    });

    it('sayaç bekleyen sayıyı gösterir; 0 gizli, 99 üstü 99+', () => {
        counts = { waitingVisits: 3, requestedLabResults: 250 };
        const fixture = create();
        expect(badges(fixture)).toEqual(['3', '99+']);

        counts = { waitingVisits: 0, requestedLabResults: null };
        const hidden = TestBed.createComponent(AppMenu);
        hidden.detectChanges();
        expect(badges(hidden)).toEqual([]);
    });
});
