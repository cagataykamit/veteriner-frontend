import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { NotificationService, UserNotificationType, type UserNotificationVm } from '@/app/entities/notification/notification.service';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppAppointmentRequestAlertComponent } from './app-appointment-request-alert.component';
import { AppNotificationBell, groupNotificationsByDay } from './app-notification-bell.component';

const NOW = new Date('2026-11-04T12:00:00Z');

const item = (id: string, over: Partial<UserNotificationVm> = {}): UserNotificationVm => ({
    id,
    type: UserNotificationType.AppointmentRequestCreated,
    title: 'Yeni online randevu talebi',
    body: 'Ayşe Yılmaz · Pamuk',
    targetType: 'AppointmentRequest',
    targetId: 'q1',
    clinicId: 'c1',
    createdAtUtc: new Date().toISOString(),
    readAtUtc: null,
    ...over
});

describe('AppNotificationBell (zil paneli)', () => {
    let fixture: ComponentFixture<AppNotificationBell>;
    let service: {
        unreadCount: ReturnType<typeof signal<number>>;
        refreshUnreadCount: ReturnType<typeof vi.fn>;
        list: ReturnType<typeof vi.fn>;
        markRead: ReturnType<typeof vi.fn>;
        markAllRead: ReturnType<typeof vi.fn>;
    };
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        service = {
            unreadCount: signal(1),
            refreshUnreadCount: vi.fn().mockReturnValue(of(1)),
            list: vi.fn().mockReturnValue(of({ items: [item('n1')], totalCount: 1, page: 1, pageSize: 20 })),
            markRead: vi.fn().mockReturnValue(of(undefined)),
            markAllRead: vi.fn().mockReturnValue(of(undefined))
        };
        TestBed.configureTestingModule({
            imports: [AppNotificationBell],
            providers: [
                provideRouter([]),
                { provide: NotificationService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: MenuBadgeService, useValue: { count: () => null } },
                { provide: AppointmentRequestsService, useValue: { list: vi.fn() } }
            ]
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        fixture = TestBed.createComponent(AppNotificationBell);
        fixture.detectChanges();
        await settle();
    });

    afterEach(() => fixture.destroy());

    const settle = async () => {
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const bell = () => fixture.nativeElement.querySelector('[data-testid="notification-bell"]') as HTMLButtonElement;
    const panel = () => document.querySelector('[data-testid="notification-panel"]') as HTMLElement | null;

    const openPanel = async () => {
        bell().click();
        await settle();
    };

    it('zil sayfaya gitmez, panel açar; okunmamışlar listelenir', async () => {
        expect(bell().getAttribute('aria-expanded')).toBe('false');

        await openPanel();

        expect(panel()).not.toBeNull();
        expect(bell().getAttribute('aria-expanded')).toBe('true');
        expect(navigate).not.toHaveBeenCalled();
        expect(service.list).toHaveBeenLastCalledWith(null, true, 1, 20);
        expect(panel()!.querySelectorAll('[data-testid="notification-panel-item"]')).toHaveLength(1);
        expect(panel()!.textContent).toContain('Bugün');
    });

    it('boş okunmamış listesinde "Okunmamış bildirim yok"; "Tümü" sekmesi tüm bildirimleri ister', async () => {
        service.list.mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 20 }));
        await openPanel();

        expect(panel()!.querySelector('[data-testid="notification-panel-empty"]')!.textContent).toContain('Okunmamış bildirim yok');

        (panel()!.querySelector('[data-testid="notification-tab-all"]') as HTMLButtonElement).click();
        await settle();

        expect(service.list).toHaveBeenLastCalledWith(null, false, 1, 20);
    });

    it('bildirime tıklanınca okundu sayılır, hedefe gidilir ve panel kapanır', async () => {
        await openPanel();

        (panel()!.querySelector('[data-testid="notification-panel-item"]') as HTMLButtonElement).click();
        await settle();

        expect(service.markRead).toHaveBeenCalledWith('n1');
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/requests'], { queryParams: { requestId: 'q1' } });
        expect(bell().getAttribute('aria-expanded')).toBe('false');
    });

    it('"Bildirim merkezine git" panel kapanır', async () => {
        await openPanel();
        const link = panel()!.querySelector('[data-testid="notification-panel-all"]') as HTMLAnchorElement;

        expect(link.getAttribute('href')).toBe('/panel/notifications');
        link.click();
        await settle();

        expect(bell().getAttribute('aria-expanded')).toBe('false');
    });

    it('"Tümünü okundu say" hepsini işaretler, sayacı ve listeyi yeniler', async () => {
        await openPanel();
        service.list.mockClear();

        (panel()!.querySelector('[data-testid="notification-panel-read-all"]') as HTMLButtonElement).click();
        await settle();

        expect(service.markAllRead).toHaveBeenCalledWith(null);
        expect(service.refreshUnreadCount).toHaveBeenCalled();
        expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('Escape paneli kapatır ve odak zile döner', async () => {
        await openPanel();

        panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();

        expect(bell().getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(bell());
    });

    it('balondaki "Bildirimler" paneli açar; panel açılınca balon kapanır', async () => {
        const alert = fixture.debugElement.query(By.directive(AppAppointmentRequestAlertComponent)).componentInstance as AppAppointmentRequestAlertComponent;

        alert.alert.set({ requestId: 'q1', detail: 'Ayşe Yılmaz · Pamuk · yarın 17:30' });
        await settle();
        (fixture.nativeElement.querySelector('[data-testid="request-alert-notifications"]') as HTMLButtonElement).click();
        await settle();

        expect(panel()).not.toBeNull();
        expect(alert.alert()).toBeNull();

        alert.alert.set({ requestId: 'q1', detail: 'tekrar' });
        bell().click();
        await settle();
        bell().click();
        await settle();

        expect(bell().getAttribute('aria-expanded')).toBe('true');
        expect(alert.alert()).toBeNull();
    });

    it('groupNotificationsByDay Bugün / Dün / Daha önce sırasıyla gruplar', () => {
        const groups = groupNotificationsByDay(
            [
                item('a', { createdAtUtc: '2026-11-04T09:00:00Z' }),
                item('b', { createdAtUtc: '2026-11-03T09:00:00Z', readAtUtc: '2026-11-03T10:00:00Z', type: UserNotificationType.AppointmentAssigned }),
                item('c', { createdAtUtc: '2026-10-30T09:00:00Z', body: null })
            ],
            NOW
        );

        expect(groups.map((g) => g.day)).toEqual(['Bugün', 'Dün', 'Daha önce']);
        expect(groups[0].rows[0]).toEqual(expect.objectContaining({ unread: true, icon: 'pi pi-calendar-plus', meta: 'Ayşe Yılmaz · Pamuk · 3 sa önce' }));
        expect(groups[1].rows[0]).toEqual(expect.objectContaining({ unread: false, icon: 'pi pi-user-plus', meta: 'Ayşe Yılmaz · Pamuk · dün' }));
        expect(groups[2].rows[0].meta).toBe('5 gün önce');
    });
});
