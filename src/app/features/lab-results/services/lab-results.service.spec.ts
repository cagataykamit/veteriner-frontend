import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { CreateLabResultRequest } from '@/app/features/lab-results/models/lab-result-create.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';

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
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'clinic-1' } }
            ]
        });
        service = TestBed.inject(LabResultsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('PUT gövdesinde rowVersion gider; 200 + {id,rowVersion} yanıtı başarı sayılır', (done) => {
        service.updateLabResult('l1', updateReq()).subscribe(() => done());
        const req = http.expectOne('http://api.test/api/v1/lab-results/l1');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body.rowVersion).toBe('AAAAAAAAB9E=');
        req.flush({ id: 'l1', rowVersion: 'AAAAAAAAB9I=' });
    });

    it('PUT 409 ham HttpErrorResponse olarak iletilir (çakışma kodu ayrıştırılabilsin)', (done) => {
        service.updateLabResult('l1', updateReq()).subscribe({
            error: (e: unknown) => {
                expect(e instanceof HttpErrorResponse).toBeTrue();
                expect((e as HttpErrorResponse).status).toBe(409);
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/lab-results/l1').flush(
            { extensions: { code: 'LabResults.ConcurrencyConflict' } },
            { status: 409, statusText: 'Conflict' }
        );
    });

    it('düzenleme verisi rowVersion taşır; sunucu rowVersion döndürmezse düzenleme reddedilir', (done) => {
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
    });
});
