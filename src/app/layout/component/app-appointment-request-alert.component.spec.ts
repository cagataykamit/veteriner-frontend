import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { AppAppointmentRequestAlertComponent, newestRequest } from './app-appointment-request-alert.component';

describe('AppAppointmentRequestAlertComponent (yeni talep uyarısı)', () => {
    const pending = signal<number | null>(null);
    let list: ReturnType<typeof vi.fn>;
    let claims: Set<string>;

    async function render() {
        await TestBed.configureTestingModule({
            imports: [AppAppointmentRequestAlertComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentRequestsService, useValue: { list } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: MenuBadgeService, useValue: { count: () => pending() } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(AppAppointmentRequestAlertComponent);
        const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');

        fixture.detectChanges();
        await fixture.whenStable();

        const step = async (value: number | null) => {
            pending.set(value);
            fixture.detectChanges();
            await fixture.whenStable();
        };

        return { fixture, add, step };
    }

    beforeEach(() => {
        claims = new Set(['AppointmentRequests.Manage']);
        pending.set(null);
        list = vi.fn().mockReturnValue(
            of({
                items: [pendingRequest('eski', { createdAtUtc: '2026-11-03T08:00:00Z' }), pendingRequest('yeni', { contactName: 'Mehmet K.', createdAtUtc: '2026-11-03T09:40:00Z' })],
                totalCount: 2,
                page: 1,
                pageSize: 20
            })
        );
    });

    it('ilk yüklemede uyarı yok; sayı artınca en yeni talep gösterilir, azalınca gösterilmez', async () => {
        const { add, step } = await render();

        await step(1);
        expect(add).not.toHaveBeenCalled();

        await step(2);
        expect(add).toHaveBeenCalledTimes(1);
        expect(add.mock.calls[0][0]).toEqual(expect.objectContaining({ summary: 'Yeni online randevu talebi', data: { requestId: 'yeni' } }));
        expect(add.mock.calls[0][0].detail).toContain('Mehmet K.');

        await step(1);
        expect(add).toHaveBeenCalledTimes(1);
    });

    it('klinik değişince (sayaç boşalır) sonraki ilk değer uyarı çıkarmaz', async () => {
        const { add, step } = await render();

        await step(1);
        await step(null);
        await step(3);

        expect(add).not.toHaveBeenCalled();
    });

    it('Aç talep penceresine gider', async () => {
        const { fixture } = await render();
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        fixture.componentInstance.open('yeni');

        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/requests'], { queryParams: { requestId: 'yeni' } });
    });

    it('yetki yoksa hiçbir şey yapmaz', async () => {
        claims = new Set();
        const { add, step } = await render();

        await step(1);
        await step(5);

        expect(list).not.toHaveBeenCalled();
        expect(add).not.toHaveBeenCalled();
    });

    it('newestRequest oluşturulma zamanı en büyük talebi seçer', () => {
        expect(newestRequest([pendingRequest('a', { createdAtUtc: '2026-11-03T08:00:00Z' }), pendingRequest('b', { createdAtUtc: '2026-11-03T10:00:00Z' })])?.id).toBe('b');
        expect(newestRequest([])).toBeNull();
    });
});
