import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationService, UserNotificationType, type UserNotificationVm } from '@/app/entities/notification/notification.service';
import { NotificationsPageComponent } from './notifications-page.component';

const item = (id: string, over: Partial<UserNotificationVm> = {}): UserNotificationVm => ({
    id,
    type: UserNotificationType.AppointmentRequestCreated,
    title: 'Yeni randevu talebi: Ayşe',
    body: 'Aşı · 2 Kasım 2026 10:00',
    targetType: 'AppointmentRequest',
    targetId: 'q1',
    clinicId: 'c1',
    createdAtUtc: '2026-10-30T09:00:00Z',
    readAtUtc: null,
    ...over
});

describe('NotificationsPageComponent', () => {
    let fixture: ComponentFixture<NotificationsPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; markRead: ReturnType<typeof vi.fn>; markAllRead: ReturnType<typeof vi.fn>; refreshUnreadCount: ReturnType<typeof vi.fn>; unreadCount: ReturnType<typeof signal<number>> };
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        service = {
            list: vi.fn().mockReturnValue(of({ items: [item('n1'), item('n2', { readAtUtc: '2026-10-30T10:00:00Z', type: UserNotificationType.AppointmentAssigned, targetType: 'Appointment', targetId: 'a1' })], totalCount: 2, page: 1, pageSize: 20 })),
            markRead: vi.fn().mockReturnValue(of(undefined)),
            markAllRead: vi.fn().mockReturnValue(of(undefined)),
            refreshUnreadCount: vi.fn().mockReturnValue(of(0)),
            unreadCount: signal(1)
        };
        await TestBed.configureTestingModule({
            imports: [NotificationsPageComponent],
            providers: [provideRouter([]), { provide: NotificationService, useValue: service }]
        }).compileComponents();
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(NotificationsPageComponent);
        fixture.detectChanges();
    });

    it('listeler; okunmamışa tıklanınca okundu işaretlenir ve talep kuyruğunda açılır', () => {
        const cmp = fixture.componentInstance;

        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="notification-item"]')).toHaveLength(2);
        cmp.open(cmp.items()[0]);

        expect(service.markRead).toHaveBeenCalledWith('n1');
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/requests'], { queryParams: { requestId: 'q1' } });
        expect(cmp.items()[0].readAtUtc).not.toBeNull();
    });

    it('okunmuş bildirim tekrar işaretlenmeden randevuya gider; tür filtresi sorguya geçer', () => {
        const cmp = fixture.componentInstance;

        cmp.open(cmp.items()[1]);
        expect(service.markRead).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments', 'a1'], { queryParams: undefined });

        cmp.onTypeChange(UserNotificationType.AppointmentRequestCancelled);
        expect(service.list).toHaveBeenLastCalledWith(UserNotificationType.AppointmentRequestCancelled, false, 1, 20);
    });

    it('portal veri talebi bildirimi etiketlenir ve gelen kutusunda ilgili talebi açar', () => {
        const cmp = fixture.componentInstance;
        const n = item('n3', { type: UserNotificationType.PortalDataRequestCreated, targetType: 'PortalDataRequest', targetId: 'dr1', readAtUtc: '2026-10-30T10:00:00Z' });

        expect(cmp.typeLabel(n.type)).toBe('Portal veri talebi');
        expect(cmp.typeOptions.map((o) => o.label)).toContain('Portal veri talebi');
        cmp.open(n);
        expect(navigate).toHaveBeenCalledWith(['/panel/portal-inbox'], { queryParams: { requestId: 'dr1' } });
    });

    it('tümünü okundu say sayacı yeniler', () => {
        fixture.componentInstance.markAllRead();

        expect(service.markAllRead).toHaveBeenCalledWith(null);
        expect(service.refreshUnreadCount).toHaveBeenCalled();
    });
});
