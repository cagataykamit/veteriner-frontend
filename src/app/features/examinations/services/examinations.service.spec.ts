import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { UpdateExaminationRequest } from '@/app/features/examinations/models/examination-create.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';

const updateReq = (over: Partial<UpdateExaminationRequest> = {}): UpdateExaminationRequest => ({
    clinicId: 'clinic-1',
    petId: 'pet-1',
    appointmentId: 'appt-1',
    rowVersion: 'AQIDBAUGBwgJCgs=',
    examinedAtUtc: '2026-10-08T10:30:00.000Z',
    visitReason: 'İştahsızlık',
    anamnesis: '',
    findings: '',
    assessment: '',
    plan: '',
    notes: '',
    clearVitals: false,
    weightKg: null,
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    vitalsMeasuredAtUtc: null,
    ...over
});

describe('ExaminationsService', () => {
    let service: ExaminationsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'clinic-1' } }
            ]
        });
        service = TestBed.inject(ExaminationsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('PUT gövdesinde rowVersion ve mevcut appointmentId gider; yanıttaki yeni rowVersion döner', (done) => {
        service.updateExamination('e1', updateReq()).subscribe((res) => {
            expect(res).toEqual({ id: 'e1', rowVersion: 'BwsMDQ4PEBESExQ=' });
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/examinations/e1');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body.rowVersion).toBe('AQIDBAUGBwgJCgs=');
        expect(req.request.body.appointmentId).toBe('appt-1');
        req.flush({ id: 'e1', rowVersion: 'BwsMDQ4PEBESExQ=' });
    });

    it('409 çakışmasında ham HttpErrorResponse (code ile) iletilir', (done) => {
        service.updateExamination('e1', updateReq()).subscribe({
            error: (e: unknown) => {
                expect(e instanceof HttpErrorResponse).toBeTrue();
                expect((e as HttpErrorResponse).status).toBe(409);
                expect((e as HttpErrorResponse).error.extensions.code).toBe('Examinations.ConcurrencyConflict');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/examinations/e1').flush(
            { status: 409, extensions: { code: 'Examinations.ConcurrencyConflict' } },
            { status: 409, statusText: 'Conflict' }
        );
    });

    it('POST yanıtından id ve rowVersion okunur; istekte rowVersion yoktur', (done) => {
        service
            .createExamination({
                clinicId: 'clinic-1',
                petId: 'pet-1',
                examinedAtUtc: '2026-10-08T10:30:00.000Z',
                visitReason: 'a',
                weightKg: null,
                temperatureC: null,
                heartRateBpm: null,
                respiratoryRatePerMin: null,
                vitalsMeasuredAtUtc: null
            })
            .subscribe((res) => {
                expect(res).toEqual({ id: 'n1', rowVersion: 'AAA=' });
                done();
            });
        const req = http.expectOne('http://api.test/api/v1/examinations');
        expect('rowVersion' in req.request.body).toBeFalse();
        req.flush({ id: 'n1', rowVersion: 'AAA=' }, { status: 201, statusText: 'Created' });
    });

    it('rowVersion dönmeyen GET düzenleme için hata verir (sürümsüz PUT 400 olurdu)', (done) => {
        service.getExaminationForEditById('e1').subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('rowVersion');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/examinations/e1').flush({
            id: 'e1',
            petId: 'p',
            clinicId: 'c',
            visitReason: 'a'
        });
    });

    it('liste isteği FromDate/ToDate yerine dateFromUtc/dateToUtc gönderir', () => {
        service.getExaminations({ fromDate: '2026-10-08', toDate: '2026-10-08' }).subscribe();
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/examinations');
        expect(req.request.params.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(req.request.params.get('dateToUtc')).toBe('2026-10-08T21:00:00.000Z');
        expect(req.request.params.has('FromDate')).toBeFalse();
        req.flush({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    });

    describe('kesinleştirme ve ek not (sözleşme: EXAMINATION_FINALIZE_API_CONTRACT)', () => {
        const problem = (status: number, code: string) => ({ status, extensions: { code } });

        it('finalize: POST /finalize gövdesinde yalnız rowVersion; yanıttan yeni sürüm ve durum döner', (done) => {
            service.finalizeExamination('e1', 'AAAAAAAAB9E=').subscribe((res) => {
                expect(res).toEqual({ id: 'e1', rowVersion: 'AAAAAAAAB9F=', status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z' });
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/examinations/e1/finalize');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ rowVersion: 'AAAAAAAAB9E=' });
            req.flush({ id: 'e1', rowVersion: 'AAAAAAAAB9F=', status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z', finalizedByUserId: 'u1' });
        });

        it('finalize 409 ConcurrencyConflict ve AlreadyFinalized Türkçe mesaja çevrilir', () => {
            const messages: string[] = [];
            for (const code of ['Examinations.ConcurrencyConflict', 'Examinations.AlreadyFinalized']) {
                service.finalizeExamination('e1', 'V').subscribe({ error: (e: Error) => messages.push(e.message) });
                http.expectOne('http://api.test/api/v1/examinations/e1/finalize').flush(problem(409, code), { status: 409, statusText: 'Conflict' });
            }

            expect(messages[0]).toContain('başka biri tarafından değiştirilmiş');
            expect(messages[1]).toContain('zaten kesinleştirilmiş');
        });

        it('ek not listesi: GET /addenda; ad çözülemeyen kayıt null ad ile gelir', (done) => {
            service.getAddenda('e1').subscribe((list) => {
                expect(list).toEqual([
                    { id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: '2026-10-11T10:05:00Z', createdByName: 'Dr. Ayşe' },
                    { id: 'a2', reason: 'Not', text: 'x', createdAtUtc: null, createdByName: null }
                ]);
                done();
            });
            http.expectOne('http://api.test/api/v1/examinations/e1/addenda').flush([
                { id: 'a1', examinationId: 'e1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: '2026-10-11T10:05:00Z', createdByName: 'Dr. Ayşe' },
                { id: 'a2', examinationId: 'e1', reason: 'Not', text: 'x', createdByName: null }
            ]);
        });

        it('ek not yazma: POST /addenda kırpılmış gerekçe ve metinle; 409 NotFinalized mesajı Türkçe', () => {
            service.addAddendum('e1', { reason: '  Hatalı kilo  ', text: ' Doğru kilo ' }).subscribe();
            const ok = http.expectOne('http://api.test/api/v1/examinations/e1/addenda');
            expect(ok.request.method).toBe('POST');
            expect(ok.request.body).toEqual({ reason: 'Hatalı kilo', text: 'Doğru kilo' });
            ok.flush({ id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo' }, { status: 201, statusText: 'Created' });

            let message = '';
            service.addAddendum('e1', { reason: 'Hatalı kilo', text: 'x' }).subscribe({ error: (e: Error) => (message = e.message) });
            http.expectOne('http://api.test/api/v1/examinations/e1/addenda').flush(problem(409, 'Examinations.NotFinalized'), { status: 409, statusText: 'Conflict' });

            expect(message).toContain('yalnızca kesinleşmiş muayeneye');
        });
    });
});
