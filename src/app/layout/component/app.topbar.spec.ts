import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Popover } from 'primeng/popover';
import { of } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { NotificationService } from '@/app/entities/notification/notification.service';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { RecentlyViewedService } from '@/app/entities/patient/services/recently-viewed.service';
import { AccountService } from '@/app/features/account/services/account.service';
import { GlobalSearchService } from '@/app/features/patients/services/global-search.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppTopbar } from './app.topbar';

const clinics = [
    { id: 'c1', name: 'Merkez Klinik', isActive: true },
    { id: 'c2', name: 'Şube Klinik', isActive: true }
] as ClinicSummary[];

type PanelName = 'bell' | 'clinic' | 'user';

describe('AppTopbar açılır paneller (aynı anda tek panel)', () => {
    let fixture: ComponentFixture<AppTopbar>;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                provideRouter([]),
                {
                    provide: AuthService,
                    useValue: { activeClinicLabel: signal('Merkez Klinik'), getJwtClinicId: () => 'c1', getMyClinics: () => of(clinics), hasOperationClaim: () => false }
                },
                {
                    provide: NotificationService,
                    useValue: { unreadCount: signal(0), refreshUnreadCount: () => of(0), list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 20 }) }
                },
                { provide: AccountService, useValue: { getAccountSummary: () => of({ userId: 'u1', email: 'ayse@example.com', displayName: 'Dr. Ayşe Yılmaz', roles: [], isTenantWide: false }) } },
                { provide: MenuBadgeService, useValue: { count: () => null } },
                { provide: AppointmentRequestsService, useValue: { list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 20 }) } },
                { provide: GlobalSearchService, useValue: { search: () => of({ clients: [], pets: [], failedKinds: [] }), canSearch: () => false } },
                { provide: RecentlyViewedService, useValue: { list: () => [] } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        fixture = TestBed.createComponent(AppTopbar);
        fixture.detectChanges();
        await settle();
    });

    afterEach(() => fixture.destroy());

    const settle = async () => {
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const styleClasses: Record<PanelName, string> = { bell: 'layout-topbar-panel--wide', clinic: 'layout-topbar-panel', user: 'layout-topbar-user-menu' };
    const popover = (name: PanelName) =>
        fixture.debugElement
            .queryAll(By.directive(Popover))
            .map((d) => d.componentInstance as Popover)
            .find((p) => (p.styleClass() ?? '').split(' ').at(-1) === styleClasses[name])!;
    const openPanels = () => (['bell', 'clinic', 'user'] as PanelName[]).filter((n) => popover(n).overlayVisible());

    const triggers: Record<PanelName, () => HTMLButtonElement> = {
        bell: () => fixture.nativeElement.querySelector('[data-testid="notification-bell"]'),
        clinic: () => fixture.nativeElement.querySelector('.layout-topbar-clinic-trigger'),
        user: () => fixture.nativeElement.querySelector('[aria-label="Kullanıcı menüsü"]')
    };

    const click = async (el: Element) => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await settle();
    };

    const pairs: [PanelName, PanelName][] = [
        ['user', 'clinic'],
        ['clinic', 'user'],
        ['bell', 'clinic'],
        ['clinic', 'bell'],
        ['bell', 'user'],
        ['user', 'bell']
    ];

    for (const [first, second] of pairs) {
        it(`${first} paneli açıkken ${second} açılınca yalnız ${second} açık kalır`, async () => {
            await click(triggers[first]());
            expect(openPanels()).toEqual([first]);

            await click(triggers[second]());

            expect(openPanels()).toEqual([second]);
            expect(triggers[first]().getAttribute('aria-expanded')).toBe('false');
            expect(triggers[second]().getAttribute('aria-expanded')).toBe('true');
        });
    }

    it('sayfada başka yere tıklanınca açık panel kapanır', async () => {
        for (const name of ['bell', 'clinic', 'user'] as PanelName[]) {
            await click(triggers[name]());
            expect(openPanels()).toEqual([name]);

            await click(document.body);

            expect(openPanels()).toEqual([]);
        }
    });

    it('Escape açık paneli kapatır', async () => {
        await click(triggers.user());
        expect(openPanels()).toEqual(['user']);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();

        expect(openPanels()).toEqual([]);
    });

    it('kullanıcı paneli ortada ad, altında "Hesap" ve "Oturum" gruplarıyla mevcut öğeleri gösterir', async () => {
        await click(triggers.user());
        const panel = document.querySelector('[data-testid="user-panel"]') as HTMLElement;

        expect(panel.querySelector('[data-testid="user-panel-name"]')!.textContent).toContain('Dr. Ayşe Yılmaz');
        expect(Array.from(panel.querySelectorAll('.layout-topbar-panel-group')).map((g) => g.textContent!.trim())).toEqual(['Hesap', 'Oturum']);
        expect(Array.from(panel.querySelectorAll('.layout-topbar-panel-row')).map((r) => r.textContent!.trim())).toEqual(['Hesabım', 'Çıkış yap', 'Tüm oturumları kapat']);
    });
});
