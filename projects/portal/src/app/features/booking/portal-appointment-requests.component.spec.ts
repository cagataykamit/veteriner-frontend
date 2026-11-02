import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { createSessionStub } from '@portal/app/testing/portal-fixtures';
import { buttonByText, problem } from '@portal/app/testing/portal-testing';
import { PortalAppointmentRequestsComponent } from './portal-appointment-requests.component';
import { PortalBookingApi } from './portal-booking.api';
import { BOOKING_PAGE, bookingRequest, SLOT_MON_0930, SLOT_TUE_1400 } from './portal-booking.fixtures';

describe('PortalAppointmentRequestsComponent (randevu taleplerim)', () => {
    let fixture: ComponentFixture<PortalAppointmentRequestsComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalBookingApi>;

    const pending = bookingRequest();
    const approvedMoved = bookingRequest({ id: 'req-2', status: 'Approved', approvedStartUtc: SLOT_TUE_1400, requestedStartUtc: SLOT_MON_0930, wasRescheduled: true, canCancel: false });
    const rejected = bookingRequest({ id: 'req-3', status: 'Rejected', rejectionReason: 'Hekim izinli', canCancel: false });

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function create(): Promise<void> {
        fixture = TestBed.createComponent(PortalAppointmentRequestsComponent);
        el = fixture.nativeElement;
        await settle();
    }

    function rows(): HTMLElement[] {
        return Array.from(el.querySelectorAll<HTMLElement>('[data-testid=request-list] li'));
    }

    beforeEach(async () => {
        api = {
            linkPage: vi.fn().mockName('linkPage'),
            myRequests: vi.fn().mockName('myRequests'),
            cancelRequest: vi.fn().mockName('cancelRequest')
        } as unknown as MockedObject<PortalBookingApi>;
        api.linkPage.mockReturnValue(of(BOOKING_PAGE));
        api.myRequests.mockReturnValue(of([pending, approvedMoved, rejected]));
        await TestBed.configureTestingModule({
            imports: [PortalAppointmentRequestsComponent],
            providers: [provideRouter([]), { provide: PortalBookingApi, useValue: api }, { provide: PortalSessionService, useValue: createSessionStub() }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('durum etiketleri, onaylanan saat, "saat değiştirildi" ve red gerekçesi', async () => {
        await create();

        expect(api.myRequests).toHaveBeenCalledWith('link-1');
        const [first, second, third] = rows();

        expect(first.textContent).toContain('Bekliyor');
        expect(first.textContent).toContain('Pazartesi, 02.11.2026 · 09:00');
        expect(second.textContent).toContain('Onaylandı');
        expect(second.textContent).toContain('Salı, 03.11.2026 · 14:00');
        expect(second.querySelector('[data-testid=rescheduled]')?.textContent).toContain('09:30');
        expect(third.textContent).toContain('Reddedildi');
        expect(third.textContent).toContain('Hekim izinli');
        expect(el.querySelector('[data-testid=new-request]')).not.toBeNull();
    });

    it('iptal onay sorusuyla yapılır; vazgeçilebilir', async () => {
        api.cancelRequest.mockReturnValue(of(bookingRequest({ status: 'Cancelled', canCancel: false, petName: null })));
        await create();

        buttonByText(rows()[0], 'Talebi iptal et')!.click();
        await settle();
        buttonByText(rows()[0], 'Vazgeç')!.click();
        await settle();
        expect(api.cancelRequest).not.toHaveBeenCalled();

        buttonByText(rows()[0], 'Talebi iptal et')!.click();
        await settle();
        buttonByText(rows()[0], 'Evet, iptal et')!.click();
        await settle();

        expect(api.cancelRequest).toHaveBeenCalledWith('link-1', 'req-1');
        expect(rows()[0].textContent).toContain('İptal edildi');
        expect(rows()[0].textContent).toContain('Pamuk');
        expect(buttonByText(rows()[0], 'Talebi iptal et')).toBeUndefined();
    });

    it('iptal reddedilirse mesaj gösterilir', async () => {
        api.cancelRequest.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.requestNotPending)));
        await create();
        buttonByText(rows()[0], 'Talebi iptal et')!.click();
        await settle();
        buttonByText(rows()[0], 'Evet, iptal et')!.click();
        await settle();

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.requestNotPending]);
    });

    it('klinik online talep almıyorsa yeni talep düğmesi gizlenir, geçmiş talepler listelenir', async () => {
        api.linkPage.mockReturnValue(throwError(() => problem(404, PORTAL_ERROR_CODES.onlineBookingNotFound)));
        await create();

        expect(el.querySelector('[data-testid=new-request]')).toBeNull();
        expect(el.querySelector('[data-testid=booking-closed]')).not.toBeNull();
        expect(rows()).toHaveLength(3);
    });

    it('talep yoksa boş durum yeni talep düğmesini içerir', async () => {
        api.myRequests.mockReturnValue(of([]));
        await create();

        expect(el.textContent).toContain('Henüz talebiniz yok');
        expect(el.querySelector('portal-empty-state [data-testid=new-request]')).not.toBeNull();
        expect(el.querySelector('[data-testid=booking-closed]')).toBeNull();
    });

    it('klinik online talep almıyorsa ve talep yoksa tek "kapalı" durumu gösterilir', async () => {
        api.linkPage.mockReturnValue(throwError(() => problem(404, PORTAL_ERROR_CODES.onlineBookingNotFound)));
        api.myRequests.mockReturnValue(of([]));
        await create();

        expect(el.querySelector('[data-testid=booking-closed]')?.textContent).toContain('Online randevu şu an kapalı');
        expect(el.querySelector('[data-testid=new-request]')).toBeNull();
        expect(el.textContent).not.toContain('Henüz talebiniz yok');
    });
});
