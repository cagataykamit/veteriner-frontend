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

describe('VisitsService — geri alma ve yanlış işaretlenenler', () => {
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

    it('voided=true sorgusu gönderilir; varsayılanda gönderilmez', () => {
        service.getToday({ voided: true }).subscribe();
        const voidedReq = http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today');
        expect(voidedReq.request.params.get('voided')).toBe('true');
        voidedReq.flush({ date: 'd', clinicId: 'c1', generatedAtUtc: 'g', items: [{ petId: 'p1', clientId: 'cl1', isCarriedOver: false, visitId: 'v1', isVoided: true, voidReason: ' Yanlış ' }] });

        service.getToday().subscribe();
        const normal = http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today');
        expect(normal.request.params.has('voided')).toBeFalse();
        normal.flush({ date: 'd', clinicId: 'c1', generatedAtUtc: 'g', items: [] });
    });

    it('geri alma gerekçeyle restore ucuna gider', () => {
        service.restoreVisit('v1', '  Yanlışlıkla işaretlendi ').subscribe();
        const req = http.expectOne('http://api.test/api/v1/visits/v1/restore');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ reason: 'Yanlışlıkla işaretlendi' });
        req.flush({ ...visit });
    });

    for (const [code, text] of [
        ['Visits.DuplicateActiveVisit', 'Bu hayvanın başka açık geliş kaydı var'],
        ['Visits.DuplicateAppointmentVisit', 'Bu randevu için başka geliş kaydı var']
    ]) {
        it(`409 ${code} Türkçe mesaja çevrilir`, (done) => {
            service.restoreVisit('v1', 'Yanlışlıkla işaretlendi').subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain(text);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/visits/v1/restore').flush({ status: 409, extensions: { code } }, { status: 409, statusText: 'Conflict' });
        });
    }

    it('400 Visits.Validation backend ayrıntısıyla gösterilir', (done) => {
        service.restoreVisit('v1', 'Yanlışlıkla işaretlendi').subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('Kayıt zaten geçerli');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/visits/v1/restore').flush({ status: 400, detail: 'Kayıt zaten geçerli', extensions: { code: 'Visits.Validation' } }, { status: 400, statusText: 'Bad Request' });
    });
});

describe('VisitsService — acil işareti', () => {
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

    it('PUT urgency ucuna isUrgent gövdesi gider ve VM isUrgent döner', (done) => {
        service.setUrgency('v1', true).subscribe((vm) => {
            expect(vm.isUrgent).toBeTrue();
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/visits/v1/urgency');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ isUrgent: true });
        req.flush({ ...visit, isUrgent: true });
    });

    it('tamamlanmış kayıtta 409 Visits.NotOpen Türkçe mesaja çevrilir', (done) => {
        service.setUrgency('v1', true).subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('tamamlanmış');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/visits/v1/urgency').flush({ status: 409, extensions: { code: 'Visits.NotOpen' } }, { status: 409, statusText: 'Conflict' });
    });

    it('acil geliş isteği yalnızca true iken gövdeye girer; Bugün satırı isUrgent taşır', () => {
        service.createVisit({ petId: 'p1', clinicId: 'c1', isUrgent: true }).subscribe();
        const req = http.expectOne('http://api.test/api/v1/visits');
        expect(req.request.body).toEqual({ petId: 'p1', clinicId: 'c1', isUrgent: true });
        req.flush({ created: true, visit: { ...visit, isUrgent: true } }, { status: 201, statusText: 'Created' });

        service.getToday().subscribe((vm) => expect(vm.items[0].isUrgent).toBeTrue());
        http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today').flush({ date: 'd', clinicId: 'c1', generatedAtUtc: 'g', items: [{ petId: 'p1', clientId: 'cl1', isCarriedOver: false, visitId: 'v1', isUrgent: true }] });
    });
});

describe('VisitsService — hekim tespiti ve Benim hastalarım', () => {
    let http: HttpTestingController;
    const setup = (userId: string | null): VisitsService => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getUserId: () => userId } }
            ]
        });
        http = TestBed.inject(HttpTestingController);
        return TestBed.inject(VisitsService);
    };

    afterEach(() => http.verify());

    it('kullanıcı klinik hekim listesindeyse kimliği döner (büyük/küçük harf duyarsız)', (done) => {
        setup('U1').getCurrentVeterinarianUserId().subscribe((id) => {
            expect(id).toBe('u1');
            done();
        });
        http.expectOne('http://api.test/api/v1/clinics/c1/veterinarians').flush([{ userId: 'u1', name: 'Dr. Ayşe' }]);
    });

    it('listede değilse null', (done) => {
        setup('u9').getCurrentVeterinarianUserId().subscribe((id) => {
            expect(id).toBeNull();
            done();
        });
        http.expectOne('http://api.test/api/v1/clinics/c1/veterinarians').flush([{ userId: 'u1', name: 'Dr. Ayşe' }]);
    });

    it('liste hatasında null (süzgeç gizlenir)', (done) => {
        setup('u1').getCurrentVeterinarianUserId().subscribe((id) => {
            expect(id).toBeNull();
            done();
        });
        http.expectOne('http://api.test/api/v1/clinics/c1/veterinarians').flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('kimlik yoksa istek atılmadan null', (done) => {
        setup(null).getCurrentVeterinarianUserId().subscribe((id) => {
            expect(id).toBeNull();
            done();
        });
    });

    it('responsibleVeterinarianUserId sorgu parametresi gider (voided ile birlikte olabilir)', () => {
        setup('u1').getToday({ voided: true, responsibleVeterinarianUserId: 'u1' }).subscribe();
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today');
        expect(req.request.params.get('responsibleVeterinarianUserId')).toBe('u1');
        expect(req.request.params.get('voided')).toBe('true');
        req.flush({ date: 'd', clinicId: 'c1', generatedAtUtc: 'g', items: [] });
    });

    it('400 Visits.Validation (hekim değil) mesajı iletilir', (done) => {
        setup('u1').getToday({ responsibleVeterinarianUserId: 'x' }).subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('Hekim değil');
                done();
            }
        });
        http.expectOne((r) => r.url === 'http://api.test/api/v1/visits/today').flush({ status: 400, detail: 'Hekim değil', extensions: { code: 'Visits.Validation' } }, { status: 400, statusText: 'Bad Request' });
    });
});
