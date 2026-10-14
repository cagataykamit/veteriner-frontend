import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ExaminationTemplateError, ExaminationTemplatesService } from './examination-templates.service';

const BASE = 'http://api.test/api/v1/examination-templates';
const empty = { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

describe('ExaminationTemplatesService', () => {
    let service: ExaminationTemplatesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(ExaminationTemplatesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste sorgusu yalnız dolu parametreleri gönderir', () => {
        service.list({ search: ' kulak ', includeInactive: true, page: 2, pageSize: 50 }).subscribe();
        const req = http.expectOne((r) => r.url === BASE);
        expect(req.request.params.get('search')).toBe('kulak');
        expect(req.request.params.get('includeInactive')).toBe('true');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('50');
        req.flush(empty);

        service.list({ search: ' ' }).subscribe();
        const plain = http.expectOne((r) => r.url === BASE);
        expect(plain.request.params.keys()).toEqual([]);
        plain.flush(empty);
    });

    it('ekle POST, düzenle PUT + rowVersion, aktiflik ayrı uçlar', () => {
        const body = { name: 'Otitis paketi', visitReason: 'Kulak kaşıntısı', findings: null, plan: null, lines: [{ productId: 'p1', quantity: 1 }] };
        service.create(body).subscribe();
        const post = http.expectOne(BASE);
        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual(body);
        post.flush({});

        service.update('t1', body, 'AAAAAAAAB9I=').subscribe();
        const put = http.expectOne(`${BASE}/t1`);
        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ ...body, rowVersion: 'AAAAAAAAB9I=' });
        put.flush({});

        service.setActive('t1', false).subscribe();
        http.expectOne(`${BASE}/t1/deactivate`).flush(null, { status: 204, statusText: 'No Content' });
        service.setActive('t1', true).subscribe();
        http.expectOne(`${BASE}/t1/activate`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('uygula muayene sürümüyle gider', () => {
        service.apply('e1', 't1', 'V1').subscribe();
        const req = http.expectOne('http://api.test/api/v1/examinations/e1/apply-template');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ templateId: 't1', rowVersion: 'V1' });
        req.flush({ examinationId: 'e1', rowVersion: 'V2', updatedFields: [], administrations: [], services: [] });
    });

    it('kod Türkçe mesaja çevrilir; reddedilen satırın productId si ürün adıyla mesaja girer', () => {
        let finalized: ExaminationTemplateError | undefined;
        service.apply('e1', 't1', 'V1').subscribe({ error: (e: ExaminationTemplateError) => (finalized = e) });
        http.expectOne('http://api.test/api/v1/examinations/e1/apply-template').flush(
            { status: 409, code: 'Examinations.Finalized' },
            { status: 409, statusText: 'Conflict' }
        );
        expect(finalized?.code).toBe('Examinations.Finalized');
        expect(finalized?.message).toContain('kesinleştirilmiş');

        let stock: ExaminationTemplateError | undefined;
        service.apply('e1', 't1', 'V1').subscribe({ error: (e: ExaminationTemplateError) => (stock = e) });
        http.expectOne('http://api.test/api/v1/examinations/e1/apply-template').flush(
            { status: 400, code: 'Administrations.InsufficientStock', detail: 'Yetersiz stok.', productId: 'p1' },
            { status: 400, statusText: 'Bad Request' }
        );
        expect(stock?.productId).toBe('p1');
        expect(stock?.withProductName((id) => (id === 'p1' ? 'Kulak damlası' : null))).toBe('"Kulak damlası" satırı: Yetersiz stok.');
        expect(stock?.withProductName(() => null)).toBe('Yetersiz stok.');

        let vaccine: ExaminationTemplateError | undefined;
        service.create({ name: 'X', visitReason: null, findings: null, plan: null, lines: [] }).subscribe({
            error: (e: ExaminationTemplateError) => (vaccine = e)
        });
        http.expectOne(BASE).flush(
            { status: 400, extensions: { code: 'ExaminationTemplates.VaccineNotAllowed', productId: 'v1' } },
            { status: 400, statusText: 'Bad Request' }
        );
        expect(vaccine?.productId).toBe('v1');
        expect(vaccine?.message).toContain('Aşı ürünü');
    });
});
