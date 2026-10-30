import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentRequestSource, AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { AppointmentRequestsPageComponent } from './appointment-requests-page.component';

const row = (id: string, over: Partial<AppointmentRequestListItemVm> = {}): AppointmentRequestListItemVm => ({
    id,
    clinicId: 'c1',
    status: AppointmentRequestStatus.Pending,
    source: AppointmentRequestSource.Link,
    reasonId: 'r1',
    reasonName: 'Aşı',
    // İstanbul 2 Kasım 2026 10:00 = 07:00 UTC
    requestedStartUtc: '2026-11-02T07:00:00Z',
    durationMinutes: 30,
    contactName: 'Ayşe Yılmaz',
    contactEmail: 'ayse@example.com',
    contactPhone: '905551234567',
    clientId: null,
    clientName: null,
    petId: null,
    petName: 'Pamuk',
    createdAtUtc: '2026-10-30T09:00:00Z',
    appointmentId: null,
    ...over
});

describe('AppointmentRequestsPageComponent', () => {
    let fixture: ComponentFixture<AppointmentRequestsPageComponent>;
    let list: ReturnType<typeof vi.fn>;
    let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    async function create(): Promise<void> {
        list = vi.fn().mockReturnValue(of({ items: [row('q1'), row('q2', { source: AppointmentRequestSource.Portal, clientName: 'Portal Sahip' })], totalCount: 2, page: 1, pageSize: 20 }));
        query = new BehaviorSubject(convertToParamMap({}));
        await TestBed.configureTestingModule({
            imports: [AppointmentRequestsPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AppointmentRequestsService, useValue: { list, get: vi.fn().mockReturnValue(of(null)) } },

                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AppointmentRequestsPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('varsayılan olarak bekleyenleri listeler; saat İstanbul duvar saatiyle, portal satırında müşteri adı görünür', async () => {
        await create();
        const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="request-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' '));

        expect(list).toHaveBeenCalledWith({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: 20 });
        expect(rows).toHaveLength(2);
        expect(rows[0]).toContain('02.11.2026 10:00');
        expect(rows[0]).toContain('Bağlantı');
        expect(rows[1]).toContain('Portal Sahip');
        expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBe(2);
    });

    it('durum filtresi değişince ilk sayfadan yeniden yükler; adres talebi açar', async () => {
        await create();
        const cmp = fixture.componentInstance;

        cmp.onStatusChange(null);
        expect(list).toHaveBeenLastCalledWith({ status: null, page: 1, pageSize: 20 });

        query.next(convertToParamMap({ requestId: 'q2' }));
        expect(cmp.openId()).toBe('q2');
    });
});
