import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { CareInstructionsService } from '@/app/features/care-instructions/services/care-instructions.service';

const dto = {
    id: 'ci1',
    clinicId: 'c1',
    petId: 'p1',
    hospitalizationId: 'h1',
    text: 'Günde iki kez yemek',
    createdAtUtc: '2026-10-13T08:00:00Z',
    updatedAtUtc: null,
    rowVersion: 'AAAAAAAAB9E='
};

describe('CareInstructionsService', () => {
    let service: CareInstructionsService;
    let http: HttpTestingController;
    let clinicId: string | null;

    beforeEach(() => {
        clinicId = 'c1';
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => clinicId } }]
        });
        service = TestBed.inject(CareInstructionsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste: yatış ve aktif klinik süzgeciyle istenir, rowVersion taşınır', (done) => {
        service.getCareInstructions({ hospitalizationId: 'h1' }).subscribe((rows) => {
            expect(rows).toEqual([{ id: 'ci1', text: 'Günde iki kez yemek', createdAtUtc: dto.createdAtUtc, updatedAtUtc: null, rowVersion: 'AAAAAAAAB9E=' }]);
            done();
        });
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/care-instructions');

        expect(req.request.params.get('hospitalizationId')).toBe('h1');
        expect(req.request.params.get('clinicId')).toBe('c1');
        req.flush({ items: [dto], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 });
    });

    it('ekleme: klinik, hayvan, yatış ve kırpılmış metin gider; 201 gövdesi id olarak okunur', (done) => {
        service.createCareInstruction({ petId: 'p1', hospitalizationId: 'h1', text: '  Dinlendirin ' }).subscribe((r) => {
            expect(r.id).toBe('ci2');
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/care-instructions');

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ clinicId: 'c1', petId: 'p1', hospitalizationId: 'h1', text: 'Dinlendirin' });
        req.flush('ci2', { status: 201, statusText: 'Created' });
    });

    it('ekleme: aktif klinik yoksa istek atılmaz', (done) => {
        clinicId = null;
        service.createCareInstruction({ petId: 'p1', hospitalizationId: 'h1', text: 'x' }).subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('klinik');
                done();
            }
        });
        http.expectNone('http://api.test/api/v1/care-instructions');
    });

    it('güncelleme: yalnız metin ve rowVersion gider; 409 ham HttpErrorResponse olarak iletilir', (done) => {
        service.updateCareInstruction('ci1', ' Yeni metin ', 'AAAAAAAAB9E=').subscribe({
            error: (e: unknown) => {
                expect((e as HttpErrorResponse).status).toBe(409);
                done();
            }
        });
        const req = http.expectOne('http://api.test/api/v1/care-instructions/ci1');

        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ text: 'Yeni metin', rowVersion: 'AAAAAAAAB9E=' });
        req.flush({ extensions: { code: 'CareInstructions.ConcurrencyConflict' } }, { status: 409, statusText: 'Conflict' });
    });
});
