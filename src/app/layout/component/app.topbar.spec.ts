import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Menu } from 'primeng/menu';
import { of } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { NotificationService } from '@/app/entities/notification/notification.service';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { RecentlyViewedService } from '@/app/entities/patient/services/recently-viewed.service';
import { GlobalSearchService } from '@/app/features/patients/services/global-search.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppTopbar } from './app.topbar';

const clinics = [
    { id: 'c1', name: 'Merkez Klinik', isActive: true },
    { id: 'c2', name: 'Şube Klinik', isActive: true }
] as ClinicSummary[];

describe('AppTopbar açılır menüler', () => {
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
                { provide: NotificationService, useValue: { unreadCount: signal(0), refreshUnreadCount: () => of(0) } },
                { provide: MenuBadgeService, useValue: { count: () => null } },
                { provide: AppointmentRequestsService, useValue: { list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 20 }) } },
                { provide: GlobalSearchService, useValue: { search: () => of({ clients: [], pets: [], failedKinds: [] }), canSearch: () => false } },
                { provide: RecentlyViewedService, useValue: { list: () => [] } }
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

    const menu = (styleClass: string) => fixture.debugElement.queryAll(By.directive(Menu)).find((d) => d.componentInstance.styleClass() === styleClass)!.componentInstance as Menu;
    const clinicMenu = () => menu('layout-clinic-switcher-menu');
    const userMenu = () => menu('layout-topbar-user-menu');

    const click = async (el: Element) => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await settle();
    };

    const clinicTrigger = () => fixture.nativeElement.querySelector('.layout-topbar-clinic-trigger') as HTMLButtonElement;
    const userTrigger = () => fixture.nativeElement.querySelector('[aria-label="Kullanıcı menüsü"]') as HTMLButtonElement;

    it('kullanıcı menüsü açıkken klinik menüsü açılınca kullanıcı menüsü kapanır', async () => {
        await click(userTrigger());
        expect(userMenu().visible()).toBe(true);

        await click(clinicTrigger());

        expect(clinicMenu().visible()).toBe(true);
        expect(userMenu().visible()).toBe(false);
    });

    it('klinik menüsü açıkken kullanıcı menüsü açılınca klinik menüsü kapanır', async () => {
        await click(clinicTrigger());
        expect(clinicMenu().visible()).toBe(true);

        await click(userTrigger());

        expect(userMenu().visible()).toBe(true);
        expect(clinicMenu().visible()).toBe(false);
    });

    it('sayfada başka yere tıklanınca açık menü kapanır', async () => {
        await click(clinicTrigger());
        expect(clinicMenu().visible()).toBe(true);

        await click(document.body);

        expect(clinicMenu().visible()).toBe(false);
    });
});
