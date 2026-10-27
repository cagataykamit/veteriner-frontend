import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { CreateLabResultRequest } from '@/app/entities/lab-result/models/lab-result-create.model';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';

const updateReq = (over: Partial<CreateLabResultRequest> = {}): CreateLabResultRequest => ({
    clinicId: 'clinic-1',
    petId: 'pet-1',
    resultDateUtc: '2026-10-12T10:00:00.000Z',
    testName: 'Hemogram',
    resultText: 'Normal',
    rowVersion: 'AAAAAAAAB9E=',
    ...over
});

describe('LabResultsService', () => {
    let service: LabResultsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'clinic-1' } }]
        });
        service = TestBed.inject(LabResultsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('PUT gövdesinde rowVersion gider; 200 + {id,rowVersion} yanıtı başarı sayılır', () =>
        new Promise<void>((done) => {
            service.updateLabResult('l1', updateReq()).subscribe(() => done());
            const req = http.expectOne('http://api.test/api/v1/lab-results/l1');

            expect(req.request.method).toBe('PUT');
            expect(req.request.body.rowVersion).toBe('AAAAAAAAB9E=');
            req.flush({ id: 'l1', rowVersion: 'AAAAAAAAB9I=' });
        }));

    it('PUT 409 ham HttpErrorResponse olarak iletilir (çakışma kodu ayrıştırılabilsin)', () =>
        new Promise<void>((done) => {
            service.updateLabResult('l1', updateReq()).subscribe({
                error: (e: unknown) => {
                    expect(e instanceof HttpErrorResponse).toBe(true);
                    expect((e as HttpErrorResponse).status).toBe(409);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/lab-results/l1').flush({ extensions: { code: 'LabResults.ConcurrencyConflict' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('düzenleme verisi rowVersion taşır; sunucu rowVersion döndürmezse düzenleme reddedilir', () =>
        new Promise<void>((done) => {
            service.getLabResultForEditById('l1').subscribe((vm) => {
                expect(vm.rowVersion).toBe('AAAAAAAAB9E=');
                service.getLabResultForEditById('l2').subscribe({
                    error: (e: Error) => {
                        expect(e.message).toContain('rowVersion');
                        done();
                    }
                });
                http.expectOne('http://api.test/api/v1/lab-results/l2').flush({ id: 'l2', testName: 'x' });
            });
            http.expectOne('http://api.test/api/v1/lab-results/l1').flush({
                id: 'l1',
                testName: 'Hemogram',
                resultText: null,
                resultDateUtc: null,
                rowVersion: 'AAAAAAAAB9E='
            });
        }));

    it('sonuçsuz istem: sonuç alanları null gider (Requested)', () =>
        new Promise<void>((done) => {
            service.createLabResult(updateReq({ resultDateUtc: null, resultText: '', rowVersion: undefined })).subscribe(() => done());
            const req = http.expectOne('http://api.test/api/v1/lab-results');

            expect(req.request.body.resultDateUtc).toBeNull();
            expect(req.request.body.resultText).toBeNull();
            req.flush({ id: 'l9' });
        }));

    it('yalnız sonuç metni (tarihsiz) istek atmadan reddedilir', () =>
        new Promise<void>((done) => {
            service.createLabResult(updateReq({ resultDateUtc: null })).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('birlikte');
                    http.expectNone('http://api.test/api/v1/lab-results');
                    done();
                }
            });
        }));

    it('iptal: gerekçe ve rowVersion cancel ucuna gider', () =>
        new Promise<void>((done) => {
            service.cancelLabResult('l1', '  Yanlış hayvan  ', 'AAAAAAAAB9E=').subscribe(() => done());
            const req = http.expectOne('http://api.test/api/v1/lab-results/l1/cancel');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: 'Yanlış hayvan', rowVersion: 'AAAAAAAAB9E=' });
            req.flush({ id: 'l1', rowVersion: 'x' });
        }));

    it('iptal: Examinations.Finalized anlaşılır mesaja çevrilir', () =>
        new Promise<void>((done) => {
            service.cancelLabResult('l1', 'Yanlış hayvan', 'v').subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('kesinleşmiş muayeneye bağlı');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/lab-results/l1/cancel').flush({ extensions: { code: 'Examinations.Finalized' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('liste süzgeci status parametresi olarak gider; boşsa gönderilmez', () =>
        new Promise<void>((done) => {
            service.getLabResults({ status: 'Cancelled' }).subscribe(() => done());
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/lab-results');

            expect(req.request.params.get('Status')).toBe('Cancelled');
            req.flush({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
        }));
});
