import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';

const visit = { id: 'v1', clinicId: 'c1', petId: 'p1', appointmentId: null, arrivedAtUtc: '2026-10-10T07:00:00Z', careStatus: 'Waiting', isVoided: false };

describe('VisitsService', () => {
    let service: VisitsService;
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
        service = TestBed.inject(VisitsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('Bugün: aktif klinik clinicId olarak gider', (done) => {
        service.getToday().subscribe((vm) => {
            expect(vm.items.length).toBe(1);
            done();
        });
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today');
        expect(req.request.params.get('clinicId')).toBe('c1');
        req.flush({ date: '2026-10-10', clinicId: 'c1', generatedAtUtc: 'g', items: [{ petId: 'p1', clientId: 'cl1', isCarriedOver: false, appointmentId: 'a1' }] });
    });

    it('geliş 201 (yeni) yanıtında created:true döner', (done) => {
        service.createVisit({ appointmentId: 'a1' }).subscribe((r) => {
            expect(r.created).toBeTrue();
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/visits');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ appointmentId: 'a1' });
        req.flush({ created: true, visit }, { status: 201, statusText: 'Created' });
    });

    it('geliş 200 (mevcut Visit) yanıtı hata değildir: created:false ile mevcut kaydı döner', (done) => {
        service.createVisit({ petId: 'p1', clinicId: 'c1' }).subscribe({
            next: (r) => {
                expect(r.created).toBeFalse();
                expect(r.visit.id).toBe('v1');
                done();
            },
            error: () => fail('200 yanıtı hata sayılmamalı')
        });
        http.expectOne('http://api.test/api/v1/visits').flush({ created: false, visit }, { status: 200, statusText: 'OK' });
    });

    it('backend hata kodu Türkçe kullanıcı mesajına çevrilir', (done) => {
        service.createVisit({ appointmentId: 'a1' }).subscribe({
            next: () => fail('hata bekleniyordu'),
            error: (e: unknown) => {
                expect(e).toBeInstanceOf(Error);
                expect(e instanceof HttpErrorResponse).toBeFalse();
                expect((e as Error).message).toBe('İptal edilmiş randevu için geliş kaydı açılamaz.');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/visits').flush(
            { status: 400, extensions: { code: 'Visits.AppointmentCancelled' } },
            { status: 400, statusText: 'Bad Request' }
        );
    });

    it('başlat / tamamla gövdesiz POST', () => {
        service.startVisit('v1').subscribe();
        const start = http.expectOne('http://api.test/api/v1/visits/v1/start');
        expect(start.request.method).toBe('POST');
        start.flush({ ...visit, careStatus: 'InProgress' });

        service.completeVisit('v1').subscribe();
        http.expectOne('http://api.test/api/v1/visits/v1/complete').flush({ ...visit, careStatus: 'Completed' });
    });

    it('düzeltme gerekçeyle birlikte corrections ucuna gider', () => {
        service.correctVisit('v1', { action: 'Mistaken', reason: 'Yanlış hasta' }).subscribe();
        const req = http.expectOne('http://api.test/api/v1/visits/v1/corrections');
        expect(req.request.body).toEqual({ reason: 'Yanlış hasta', targetCareStatus: null, markAsMistaken: true });
        req.flush({ ...visit, isVoided: true });
    });

    it('hekim listesi kliniğe göre çekilir', (done) => {
        service.getVeterinarians('c1').subscribe((vets) => {
            expect(vets).toEqual([{ userId: 'u1', name: 'Dr. Ayşe' }]);
            done();
        });
        http.expectOne('http://api.test/api/v1/clinics/c1/veterinarians').flush([{ userId: 'u1', name: 'Dr. Ayşe' }]);
    });
});
