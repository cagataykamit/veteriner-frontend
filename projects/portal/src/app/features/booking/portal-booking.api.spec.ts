import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { isAnonymousPortalPath } from '@portal/app/core/api/portal-endpoints';
import { PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { configurePortalHttp, testTokens } from '@portal/app/testing/portal-testing';
import { appointmentRequestStatus } from '@portal/app/shared/format/portal-labels';
import { PORTAL_BOOKING_DAYS, PortalBookingApi } from './portal-booking.api';
import { BOOKING_DAYS, BOOKING_PAGE, bookingRequest, SLOT_MON_0900 } from './portal-booking.fixtures';

describe('PortalBookingApi (online randevu talebi uçları)', () => {
    let api: PortalBookingApi;
    let http: HttpTestingController;

    beforeEach(() => {
        configurePortalHttp();
        api = TestBed.inject(PortalBookingApi);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        TestBed.inject(PortalTokenStore).clear();
    });

    it('kimliksiz bağlantı uçları kodu kodlayarak çağrılır ve Bearer eklenmez', async () => {
        TestBed.inject(PortalTokenStore).save(testTokens(1));

        const page = firstValueFrom(api.publicPage('ab c'));
        const pageReq = http.expectOne('/api/portal/v1/booking/ab%20c');

        expect(pageReq.request.headers.has('Authorization')).toBe(false);
        pageReq.flush(BOOKING_PAGE);
        expect((await page).clinicName).toBe('Merkez Veteriner');

        const days = firstValueFrom(api.publicAvailability('kod', 'reason-1'));
        const daysReq = http.expectOne((r) => r.url === '/api/portal/v1/booking/kod/availability');

        expect(daysReq.request.params.get('reasonId')).toBe('reason-1');
        expect(daysReq.request.params.get('days')).toBe(String(PORTAL_BOOKING_DAYS));
        expect(daysReq.request.params.has('from')).toBe(false);
        daysReq.flush(BOOKING_DAYS);
        expect(await days).toHaveLength(3);

        void firstValueFrom(api.requestPublicCode('kod', 'a@example.com'));
        const codeReq = http.expectOne('/api/portal/v1/booking/kod/verification-code');

        expect(codeReq.request.method).toBe('POST');
        expect(codeReq.request.body).toEqual({ email: 'a@example.com' });
        codeReq.flush(null, { status: 204, statusText: 'No Content' });

        void firstValueFrom(
            api.createPublicRequest('kod', {
                email: 'a@example.com',
                verificationCode: '123456',
                contactName: 'Ayşe',
                phone: '05551234567',
                petName: 'Pamuk',
                petSpecies: null,
                petBreed: null,
                reasonId: 'reason-1',
                requestedStartUtc: SLOT_MON_0900,
                note: null
            })
        );
        const createReq = http.expectOne('/api/portal/v1/booking/kod/requests');

        expect(createReq.request.headers.has('Authorization')).toBe(false);
        createReq.flush({ id: 'req-1', status: 'Pending', requestedStartUtc: SLOT_MON_0900 });
    });

    it('oturumlu uçlar bağ yoluyla çağrılır', async () => {
        void firstValueFrom(api.linkPage('link-1'));
        http.expectOne('/api/portal/v1/links/link-1/booking').flush(BOOKING_PAGE);

        void firstValueFrom(api.linkAvailability('link-1', 'reason-2'));
        http.expectOne((r) => r.url === '/api/portal/v1/links/link-1/booking/availability' && r.params.get('reasonId') === 'reason-2').flush([]);

        const list = firstValueFrom(api.myRequests('link-1'));

        http.expectOne('/api/portal/v1/links/link-1/appointment-requests').flush([bookingRequest()]);
        expect((await list)[0].id).toBe('req-1');

        void firstValueFrom(api.cancelRequest('link-1', 'req-1'));
        const cancel = http.expectOne('/api/portal/v1/links/link-1/appointment-requests/req-1/cancel');

        expect(cancel.request.method).toBe('POST');
        cancel.flush(bookingRequest({ status: 'Cancelled', canCancel: false }));
    });

    it('booking/ yolları anonimdir; durum etiketi metni okur, eski sayıyı da kabul eder', () => {
        expect(isAnonymousPortalPath('booking/kod/requests')).toBe(true);
        expect(isAnonymousPortalPath('links/link-1/booking')).toBe(false);

        expect(appointmentRequestStatus('Pending').label).toBe('Bekliyor');
        expect(appointmentRequestStatus('Expired').label).toBe('Süresi doldu');
        // Eski sayısal yanıt (sözleşme §13.4 öncesi) sıra numarasıyla okunur.
        expect(appointmentRequestStatus(0).label).toBe('Bekliyor');
        expect(appointmentRequestStatus(1).label).toBe('Onaylandı');
        expect(appointmentRequestStatus('Rejected').label).toBe('Reddedildi');
        expect(appointmentRequestStatus(4).label).toBe('Süresi doldu');
        expect(appointmentRequestStatus(9).label).toBe('Bilinmiyor');
    });
});
