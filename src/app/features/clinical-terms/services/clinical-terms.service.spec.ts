import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ClinicalTermError, ClinicalTermsService } from './clinical-terms.service';

describe('ClinicalTermsService', () => {
    let service: ClinicalTermsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(ClinicalTermsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste sorgusu yalnız dolu parametreleri gönderir', () => {
        service.list({ kind: 'Diagnosis', search: '  otit ', includeInactive: true, page: 2, pageSize: 50 }).subscribe();
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/clinical-terms');

        expect(req.request.params.get('kind')).toBe('Diagnosis');
        expect(req.request.params.get('search')).toBe('otit');
        expect(req.request.params.get('includeInactive')).toBe('true');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('50');
        req.flush({ items: [], page: 2, pageSize: 50, totalItems: 0, totalPages: 0 });

        service.list({ kind: 'Complaint', search: ' ' }).subscribe();
        const plain = http.expectOne((r) => r.url === 'http://api.test/api/v1/clinical-terms');

        expect(plain.request.params.keys()).toEqual(['kind']);
        plain.flush({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    });

    it('ekleme ve ad düzeltme gövdesi sözleşmeye uyar', () => {
        service.create('Complaint', ' Kulak akıntısı ').subscribe();
        const post = http.expectOne('http://api.test/api/v1/clinical-terms');

        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual({ kind: 'Complaint', name: 'Kulak akıntısı' });
        post.flush({});

        service.rename('t1', 'Otitis externa', 'AAAAAAAAB9I=').subscribe();
        const put = http.expectOne('http://api.test/api/v1/clinical-terms/t1');

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ name: 'Otitis externa', rowVersion: 'AAAAAAAAB9I=' });
        put.flush({});
    });

    it('pasifleştir / etkinleştir ayrı uçlara gider', () => {
        service.setActive('t1', false).subscribe();
        http.expectOne('http://api.test/api/v1/clinical-terms/t1/deactivate').flush(null, { status: 204, statusText: 'No Content' });
        service.setActive('t1', true).subscribe();
        http.expectOne('http://api.test/api/v1/clinical-terms/t1/activate').flush(null, { status: 204, statusText: 'No Content' });
    });

    it('409 çakışması işaretlenir; mükerrer ad anlaşılır mesaja çevrilir', () => {
        let conflict: ClinicalTermError | undefined;

        service.rename('t1', 'X', 'V1').subscribe({ error: (e: ClinicalTermError) => (conflict = e) });
        http.expectOne('http://api.test/api/v1/clinical-terms/t1').flush(
            { status: 409, code: 'ClinicalTerms.ConcurrencyConflict' },
            { status: 409, statusText: 'Conflict' }
        );
        expect(conflict?.isConflict).toBeTrue();
        expect(conflict?.isDuplicateName).toBeFalse();

        let duplicate: ClinicalTermError | undefined;

        service.create('Diagnosis', 'GASTROENTERİT').subscribe({ error: (e: ClinicalTermError) => (duplicate = e) });
        http.expectOne('http://api.test/api/v1/clinical-terms').flush(
            { status: 409, extensions: { code: 'ClinicalTerms.DuplicateName' } },
            { status: 409, statusText: 'Conflict' }
        );
        expect(duplicate?.isConflict).toBeFalse();
        expect(duplicate?.isDuplicateName).toBeTrue();
        expect(duplicate?.message).toContain('zaten var');
    });
});
