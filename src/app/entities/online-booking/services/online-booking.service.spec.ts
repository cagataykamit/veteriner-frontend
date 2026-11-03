import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { NotificationService, notificationTargetUrl, UserNotificationType } from '@/app/entities/notification/notification.service';
import { AppointmentRequestEmailKind, AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService, AppointmentRequestsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { OnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';

describe('online randevu servisleri', () => {
    let http: HttpTestingController;
    const base = 'http://api.test';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: base }]
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('neden gövdesi adı kırpar, boş sırayı 0 yapar ve hekim listesini taşır', () => {
        TestBed.inject(AppointmentReasonsService)
            .create('c1', { name: ' Aşı ', defaultDurationMinutes: 15.6, isOnlineBookable: true, sortOrder: null, veterinarianUserIds: ['v1'] })
            .subscribe();
        const req = http.expectOne(`${base}/api/v1/clinics/c1/appointment-reasons`);

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ name: 'Aşı', defaultDurationMinutes: 15, isOnlineBookable: true, sortOrder: 0, veterinarianUserIds: ['v1'] });
        req.flush({ id: 'r1', clinicId: 'c1', name: 'Aşı', defaultDurationMinutes: 15, isOnlineBookable: true, sortOrder: 0, isActive: true, veterinarianUserIds: null });
    });

    it('mükerrer ad hatası kullanıcı mesajına ve koda çevrilir', () => {
        let error: unknown;

        TestBed.inject(AppointmentReasonsService)
            .create('c1', { name: 'Aşı', defaultDurationMinutes: 15, isOnlineBookable: true, sortOrder: 1, veterinarianUserIds: [] })
            .subscribe({ error: (e) => (error = e) });
        http.expectOne(`${base}/api/v1/clinics/c1/appointment-reasons`).flush(
            { code: 'AppointmentReasons.DuplicateName', detail: 'x' },
            { status: 409, statusText: 'Conflict' }
        );

        expect(error).toBeInstanceOf(OnlineBookingError);
        expect((error as OnlineBookingError).code).toBe('AppointmentReasons.DuplicateName');
        expect((error as OnlineBookingError).message).toContain('bu adda aktif');
    });

    it('kuyruk listesi durum ve aralık parametrelerini gönderir', () => {
        TestBed.inject(AppointmentRequestsService)
            .list({ status: AppointmentRequestStatus.Pending, fromUtc: '2026-11-01T21:00:00.000Z', toUtc: '2026-11-02T21:00:00.000Z', page: 2, pageSize: 50 })
            .subscribe((r) => expect(r.totalCount).toBe(1));
        const req = http.expectOne((r) => r.url === `${base}/api/v1/appointment-requests`);

        expect(req.request.params.get('status')).toBe('0');
        expect(req.request.params.get('fromUtc')).toBe('2026-11-01T21:00:00.000Z');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('50');
        // Sunucu PagedResult toplamı totalItems'ta taşır; görünüm modeli totalCount'a çevirir.
        req.flush({ items: [], page: 2, pageSize: 50, totalItems: 1, totalPages: 1 });
    });

    it('onay ve red gövdeleri sözleşmedeki alanlarla gider; e-posta önizlemesi tür adını kullanır', () => {
        const service = TestBed.inject(AppointmentRequestsService);

        service.approve('q1', { clientId: 'cl1', petId: 'p1', scheduledAtUtc: null, veterinarianUserId: null, email: null }).subscribe();
        const approve = http.expectOne(`${base}/api/v1/appointment-requests/q1/approve`);

        expect(approve.request.body).toEqual({ clientId: 'cl1', petId: 'p1', scheduledAtUtc: null, veterinarianUserId: null, email: null });
        approve.flush({});

        service.reject('q1', '  Hekim izinli ', { subject: 'K', body: 'M' }).subscribe();
        const reject = http.expectOne(`${base}/api/v1/appointment-requests/q1/reject`);

        expect(reject.request.body).toEqual({ reason: 'Hekim izinli', email: { subject: 'K', body: 'M' } });
        reject.flush({});

        service.previewEmail('q1', AppointmentRequestEmailKind.Rescheduled, '2026-11-02T07:00:00.000Z', null).subscribe();
        const preview = http.expectOne((r) => r.url === `${base}/api/v1/appointment-requests/q1/email-preview`);

        expect(preview.request.params.get('kind')).toBe('Rescheduled');
        expect(preview.request.params.get('scheduledAtUtc')).toBe('2026-11-02T07:00:00.000Z');
        preview.flush({ subject: 's', body: 'b' });
    });

    it('şablon uçları tür adını route\'ta kullanır; müsaitlik parametreleri gider', () => {
        const service = TestBed.inject(OnlineBookingService);

        service.saveEmailTemplate('c1', AppointmentRequestEmailKind.Approved, { subject: 'S', body: 'B' }).subscribe();
        http.expectOne(`${base}/api/v1/clinics/c1/appointment-request-email-templates/Approved`).flush({});

        service.resetEmailTemplate('c1', AppointmentRequestEmailKind.Rejected).subscribe();
        const reset = http.expectOne(`${base}/api/v1/clinics/c1/appointment-request-email-templates/Rejected`);

        expect(reset.request.method).toBe('DELETE');
        reset.flush({});

        service.availability('c1', 'r1', '2026-11-02', 3).subscribe();
        const availability = http.expectOne((r) => r.url === `${base}/api/v1/clinics/c1/online-booking/availability`);

        expect(availability.request.params.get('reasonId')).toBe('r1');
        expect(availability.request.params.get('from')).toBe('2026-11-02');
        expect(availability.request.params.get('days')).toBe('3');
        availability.flush([]);
    });

    it('bildirim sayacı okundu işaretiyle azalır; hedef adresi talebi doğrudan açar', () => {
        const service = TestBed.inject(NotificationService);

        service.refreshUnreadCount().subscribe();
        http.expectOne(`${base}/api/v1/notifications/unread-count`).flush({ count: 2 });
        expect(service.unreadCount()).toBe(2);

        service.markRead('n1').subscribe();
        http.expectOne(`${base}/api/v1/notifications/n1/read`).flush(null);
        expect(service.unreadCount()).toBe(1);

        service.list(UserNotificationType.AppointmentAssigned, true).subscribe((r) => expect(r.totalCount).toBe(3));
        const list = http.expectOne((r) => r.url === `${base}/api/v1/notifications`);

        expect(list.request.params.get('type')).toBe('2');
        expect(list.request.params.get('unreadOnly')).toBe('true');
        list.flush({ items: [], page: 1, pageSize: 20, totalItems: 3, totalPages: 1 });

        expect(notificationTargetUrl({ targetType: 'AppointmentRequest', targetId: 'q1' })).toEqual({
            commands: ['/panel/appointments/requests'],
            queryParams: { requestId: 'q1' }
        });
        expect(notificationTargetUrl({ targetType: 'Appointment', targetId: 'a1' })).toEqual({ commands: ['/panel/appointments', 'a1'] });
        expect(notificationTargetUrl({ targetType: 'Bilinmeyen', targetId: 'x' })).toBeNull();
    });
});
