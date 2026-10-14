import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';

describe('AppointmentsService — durum geçişleri', () => {
    let service: AppointmentsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'c1' } }
            ]
        });
        service = TestBed.inject(AppointmentsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('gelmedi işaretleme: gerekçe boşsa gövde boş, doluysa kırpılmış gider', () => {
        service.markNoShow('a1').subscribe();
        const first = http.expectOne('http://api.test/api/v1/appointments/a1/no-show');
        expect(first.request.method).toBe('POST');
        expect(first.request.body).toEqual({});
        first.flush(null, { status: 204, statusText: 'No Content' });

        service.markNoShow('a1', '  Aradık, gelmedi ').subscribe();
        const second = http.expectOne('http://api.test/api/v1/appointments/a1/no-show');
        expect(second.request.body).toEqual({ reason: 'Aradık, gelmedi' });
        second.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('geri alma gerekçeyle no-show/revert ucuna gider', () => {
        service.revertNoShow('a1', ' Hasta geldi ').subscribe();
        const req = http.expectOne('http://api.test/api/v1/appointments/a1/no-show/revert');
        expect(req.request.body).toEqual({ reason: 'Hasta geldi' });
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('iptal ve tamamlama kendi uçlarına gider', () => {
        service.cancelAppointment('a1').subscribe();
        const cancel = http.expectOne('http://api.test/api/v1/appointments/a1/cancel');
        expect(cancel.request.body).toEqual({});
        cancel.flush(null, { status: 204, statusText: 'No Content' });
        service.cancelAppointment('a1', ' Hasta vefat etti ').subscribe();
        const withReason = http.expectOne('http://api.test/api/v1/appointments/a1/cancel');
        expect(withReason.request.body).toEqual({ reason: 'Hasta vefat etti' });
        withReason.flush(null, { status: 204, statusText: 'No Content' });
        service.completeAppointment('a1').subscribe();
        http.expectOne('http://api.test/api/v1/appointments/a1/complete').flush(null, { status: 204, statusText: 'No Content' });
    });

    for (const [code, text] of [
        ['Appointments.NoShowNotYetDue', 'saati henüz gelmedi'],
        ['Appointments.HasVisit', 'geliş kaydı var'],
        ['Appointments.InvalidStatusTransition', 'durumu bu işleme uygun değil']
    ]) {
        it(`400 ${code} Türkçe mesaja çevrilir`, (done) => {
            service.markNoShow('a1').subscribe({
                error: (e: Error) => {
                    expect(e.message.toLocaleLowerCase('tr-TR')).toContain(text.toLocaleLowerCase('tr-TR'));
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/appointments/a1/no-show').flush({ status: 400, extensions: { code } }, { status: 400, statusText: 'Bad Request' });
        });
    }
});
