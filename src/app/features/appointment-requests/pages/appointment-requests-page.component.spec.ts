import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentRequestChannel, AppointmentRequestSource, AppointmentRequestStatus, type AppointmentRequestChannelSummaryVm, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { AppointmentRequestChannelSummaryComponent } from '@/app/features/appointment-requests/components/appointment-request-channel-summary.component';
import { AppointmentRequestsPageComponent } from './appointment-requests-page.component';

const row = (id: string, over: Partial<AppointmentRequestListItemVm> = {}): AppointmentRequestListItemVm => ({
    id,
    clinicId: 'c1',
    status: AppointmentRequestStatus.Pending,
    source: AppointmentRequestSource.Link,
    channel: AppointmentRequestChannel.ClinicSite,
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

const SUMMARY: AppointmentRequestChannelSummaryVm = {
    from: '2026-10-10',
    to: '2026-11-08',
    rows: [
        { channel: AppointmentRequestChannel.ClinicSite, total: 5, approved: 3 },
        { channel: AppointmentRequestChannel.OwnerPortal, total: 2, approved: 1 },
        { channel: null, total: 4, approved: 2 }
    ],
    total: 11,
    approved: 6
};

describe('AppointmentRequestsPageComponent', () => {
    let fixture: ComponentFixture<AppointmentRequestsPageComponent>;
    let list: ReturnType<typeof vi.fn>;
    let channelSummary: ReturnType<typeof vi.fn>;
    let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    async function create(): Promise<void> {
        list = vi.fn().mockReturnValue(of({ items: [row('q1'), row('q2', { source: AppointmentRequestSource.Portal, channel: null, clientName: 'Portal Sahip' })], totalCount: 2, page: 1, pageSize: 20 }));
        channelSummary = vi.fn().mockReturnValue(of(SUMMARY));
        query = new BehaviorSubject(convertToParamMap({}));
        await TestBed.configureTestingModule({
            imports: [AppointmentRequestsPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { queryParamMap: query.asObservable(), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AppointmentRequestsService, useValue: { list, channelSummary, get: vi.fn().mockReturnValue(of(null)) } },

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
        expect(rows[0]).toContain('Kendi sitesi');
        expect(rows[1]).toContain('Bilinmiyor');
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

    it('kaynağa göre özet son 30 günü gösterir; eski talepler "Bilinmiyor", dönem değişince yeniden ister (TIER-016)', async () => {
        await create();
        const el = fixture.nativeElement as HTMLElement;
        const rows = Array.from(el.querySelectorAll('[data-testid="channel-summary-row"]')).map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim()).join(' '));

        expect(channelSummary).toHaveBeenCalledTimes(1);
        const [from, to] = channelSummary.mock.calls[0] as [string, string];

        expect(Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)).toBe(29);
        expect(rows).toEqual(['Kendi sitesi 5 3', 'Portal 2 1', 'Bilinmiyor 4 2']);
        expect(el.querySelector('[data-testid="channel-summary-total"]')?.textContent?.trim()).toBe('11');

        channelSummary.mockReturnValue(of({ ...SUMMARY, rows: [], total: 0, approved: 0 }));
        const summary = fixture.debugElement.query(By.directive(AppointmentRequestChannelSummaryComponent)).componentInstance as AppointmentRequestChannelSummaryComponent;

        summary.onFromChange('2026-01-01');
        fixture.detectChanges();

        expect(channelSummary).toHaveBeenLastCalledWith('2026-01-01', to);
        expect(el.querySelector('[data-testid="channel-summary-empty"]')?.textContent).toContain('Bu dönemde talep yok.');

        // Ters aralıkta istek atılmaz.
        summary.onToChange('2025-12-31');
        expect(channelSummary).toHaveBeenCalledTimes(2);
    });

    it('talep kararı sonrası özet de yenilenir (onaylanan sayısı değişir)', async () => {
        await create();
        fixture.componentInstance.onDialogClosed(true);

        expect(channelSummary).toHaveBeenCalledTimes(2);
    });
});
