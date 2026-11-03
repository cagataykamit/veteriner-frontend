import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { PendingAppointmentRequestsCardComponent } from './pending-appointment-requests-card.component';

describe('PendingAppointmentRequestsCardComponent (Bugün ekranı)', () => {
    let list: ReturnType<typeof vi.fn>;
    let claims: Set<string>;

    async function render() {
        await TestBed.configureTestingModule({
            imports: [PendingAppointmentRequestsCardComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentRequestsService, useValue: { list } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(PendingAppointmentRequestsCardComponent);

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    }

    beforeEach(() => {
        claims = new Set(['AppointmentRequests.Manage']);
        list = vi.fn().mockReturnValue(of({ items: [pendingRequest('r1'), pendingRequest('r2', { petName: null })], totalCount: 7, page: 1, pageSize: 5 }));
    });

    it('bekleyen talepleri gösterir; Aç talep penceresini açar; sayı menü sayacına bildirilir', async () => {
        const { el } = await render();

        expect(list).toHaveBeenCalledWith({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: 5 });
        expect(el.querySelector('[data-testid="pending-requests-card"] h2')?.textContent).toContain('(7)');
        expect(el.querySelectorAll('[data-testid="pending-request-row"]').length).toBe(2);
        expect(el.querySelectorAll('[data-testid="pending-request-row"]')[1].textContent).toContain('Hayvan belirtilmedi');
        expect(el.querySelector('[data-testid="pending-request-open"]')?.getAttribute('href')).toBe('/panel/appointments/requests?requestId=r1');
        expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBe(7);
    });

    it('sayfa yenilenince (refreshTick) yeniden yüklenir; kart kapanınca sayaç bildirimi bırakılır', async () => {
        const { fixture } = await render();

        fixture.componentRef.setInput('refreshTick', 1);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(list).toHaveBeenCalledTimes(2);

        fixture.destroy();
        expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBeUndefined();
    });

    it('bekleyen yoksa kart çizilmez', async () => {
        list.mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 5 }));
        const { el } = await render();

        expect(el.querySelector('[data-testid="pending-requests-card"]')).toBeNull();
    });

    it('talep yönetme yetkisi yoksa sorgu atılmaz', async () => {
        claims = new Set();
        const { el } = await render();

        expect(list).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="pending-requests-card"]')).toBeNull();
    });
});
