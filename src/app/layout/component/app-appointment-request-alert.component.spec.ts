import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { NotificationService } from '@/app/entities/notification/notification.service';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppAppointmentRequestAlertComponent, newestRequest, REQUEST_ALERT_LIFE_MS, requestAlertDetail } from './app-appointment-request-alert.component';

describe('AppAppointmentRequestAlertComponent (zile bağlı talep balonu)', () => {
    const pending = signal<number | null>(null);
    const unread = signal(0);
    let list: ReturnType<typeof vi.fn>;
    let claims: Set<string>;

    async function render() {
        await TestBed.configureTestingModule({
            imports: [AppAppointmentRequestAlertComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentRequestsService, useValue: { list } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: MenuBadgeService, useValue: { count: () => pending() } },
                { provide: NotificationService, useValue: { unreadCount: unread, refreshUnreadCount: () => of(unread()) } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(AppAppointmentRequestAlertComponent);

        fixture.detectChanges();
        await fixture.whenStable();

        const step = async (value: number | null) => {
            pending.set(value);
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        };

        const balloon = () => fixture.nativeElement.querySelector('[data-testid="request-alert"]') as HTMLElement | null;

        return { fixture, step, balloon };
    }

    beforeEach(() => {
        claims = new Set(['AppointmentRequests.Manage']);
        pending.set(null);
        unread.set(0);
        list = vi.fn().mockReturnValue(
            of({
                items: [pendingRequest('eski', { createdAtUtc: '2026-11-03T08:00:00Z' }), pendingRequest('yeni', { contactName: 'Mehmet K.', createdAtUtc: '2026-11-03T09:40:00Z' })],
                totalCount: 2,
                page: 1,
                pageSize: 20
            })
        );
    });

    afterEach(() => vi.useRealTimers());

    it('ilk yüklemede balon yok; sayı artınca en yeni talep gösterilir, azalınca gösterilmez', async () => {
        const { fixture, step, balloon } = await render();

        await step(1);
        expect(balloon()).toBeNull();

        await step(2);
        expect(fixture.componentInstance.alert()?.requestId).toBe('yeni');
        expect(balloon()!.textContent).toContain('Yeni online randevu talebi');
        expect(balloon()!.textContent).toContain('Mehmet K.');

        fixture.componentInstance.dismiss();
        await step(1);
        expect(fixture.componentInstance.alert()).toBeNull();
    });

    it('klinik değişince (sayaç boşalır) sonraki ilk değer balon çıkarmaz', async () => {
        const { fixture, step } = await render();

        await step(1);
        await step(null);
        await step(3);

        expect(fixture.componentInstance.alert()).toBeNull();
    });

    it('"İncele" talep penceresine gider ve balonu kapatır', async () => {
        const { fixture, step, balloon } = await render();
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        await step(1);
        await step(2);
        (balloon()!.querySelector('[data-testid="request-alert-open"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/requests'], { queryParams: { requestId: 'yeni' } });
        expect(balloon()).toBeNull();
    });

    it('"Bildirimler (N)" okunmamış sayısını gösterir, zil panelini ister ve balonu kapatır', async () => {
        const { fixture, step, balloon } = await render();
        const show = vi.fn();

        fixture.componentInstance.showNotifications.subscribe(show);
        unread.set(3);
        await step(1);
        await step(2);
        const button = balloon()!.querySelector('[data-testid="request-alert-notifications"]') as HTMLButtonElement;

        expect(button.textContent!.trim()).toBe('Bildirimler (3)');
        button.click();
        fixture.detectChanges();

        expect(show).toHaveBeenCalledTimes(1);
        expect(balloon()).toBeNull();
    });

    it('20 sn sonra kendiliğinden kapanır', async () => {
        const { fixture, step } = await render();

        vi.useFakeTimers();
        await step(1);
        await step(2);
        expect(fixture.componentInstance.alert()).not.toBeNull();

        vi.advanceTimersByTime(REQUEST_ALERT_LIFE_MS);

        expect(fixture.componentInstance.alert()).toBeNull();
    });

    it('yetki yoksa hiçbir şey yapmaz', async () => {
        claims = new Set();
        const { fixture, step } = await render();

        await step(1);
        await step(5);

        expect(list).not.toHaveBeenCalled();
        expect(fixture.componentInstance.alert()).toBeNull();
    });

    it('newestRequest oluşturulma zamanı en büyük talebi seçer; ayrıntı "ad · hayvan · gün saat"', () => {
        expect(newestRequest([pendingRequest('a', { createdAtUtc: '2026-11-03T08:00:00Z' }), pendingRequest('b', { createdAtUtc: '2026-11-03T10:00:00Z' })])?.id).toBe('b');
        expect(newestRequest([])).toBeNull();
        expect(requestAlertDetail(pendingRequest('a', { contactName: 'Ayşe Yılmaz', petName: 'Pamuk', requestedStartUtc: '2026-11-04T14:30:00Z' }), new Date('2026-11-03T12:00:00Z'))).toBe('Ayşe Yılmaz · Pamuk · yarın 17:30');
    });
});
