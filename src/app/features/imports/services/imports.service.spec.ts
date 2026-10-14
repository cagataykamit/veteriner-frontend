import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ImportsService } from '@/app/features/imports/services/imports.service';

describe('ImportsService', () => {
    let service: ImportsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(ImportsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('listeyi sayfa ve durum süzgeciyle ister', () => {
        service.listBatches(2, 20, 'Validated').subscribe();
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/imports/batches');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('20');
        expect(req.request.params.get('status')).toBe('Validated');
        req.flush({ items: [], page: 2, pageSize: 20, totalItems: 0, totalPages: 0 });
    });

    it('yüklemeyi multipart gövde olarak gönderir', () => {
        const form = new FormData();
        form.append('requestId', 'r-1');
        service.createBatch(form).subscribe();
        const req = http.expectOne('http://api.test/api/v1/imports/batches');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBe(form);
        req.flush({});
    });

    it('doğrulamayı POST ile başlatır, eşlemeyi PUT ile kaydeder', () => {
        service.validate('b1').subscribe();
        http.expectOne({ method: 'POST', url: 'http://api.test/api/v1/imports/batches/b1/validate' }).flush({});
        service.saveMapping('b1', { columns: {}, valueMappings: [], options: { onDuplicateClient: 'Match' } }).subscribe();
        http.expectOne({ method: 'PUT', url: 'http://api.test/api/v1/imports/batches/b1/mapping' }).flush({});
    });

    it('satır süzgeçlerini sorguya ekler, boş olanları eklemez', () => {
        service.getRows('b1', { page: 1, pageSize: 25, table: 'pets', status: 'Error' }).subscribe();
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/imports/batches/b1/rows');
        expect(req.request.params.get('table')).toBe('pets');
        expect(req.request.params.get('status')).toBe('Error');
        expect(req.request.params.has('code')).toBeFalse();
        req.flush({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 });
    });

    it('şablonu ve hata raporunu dosya olarak ister; CSV şablonu tablo ister', () => {
        service.downloadTemplate('csv', 'pets').subscribe();
        const t = http.expectOne((r) => r.url === 'http://api.test/api/v1/imports/template');
        expect(t.request.params.get('format')).toBe('csv');
        expect(t.request.params.get('table')).toBe('pets');
        expect(t.request.responseType).toBe('blob');
        t.flush(new Blob(['x']));

        service.downloadErrorReport('b1', 'xlsx').subscribe();
        const e = http.expectOne((r) => r.url === 'http://api.test/api/v1/imports/batches/b1/errors');
        expect(e.request.params.get('format')).toBe('xlsx');
        e.flush(new Blob(['x']));
    });

    it('uygulamayı doğrulama kimliği ve hata politikasıyla başlatır', () => {
        service.commit('b1', { validationId: 'v1', onErrors: 'SkipErrorRows' }).subscribe();
        const req = http.expectOne('http://api.test/api/v1/imports/batches/b1/commit');
        expect(req.request.body).toEqual({ validationId: 'v1', onErrors: 'SkipErrorRows' });
        req.flush({});
    });

    it('ilerlemeyi progress ucundan, hatırlatma açmayı sayı onayıyla ister', () => {
        service.getProgress('b1').subscribe();
        http.expectOne({ method: 'GET', url: 'http://api.test/api/v1/imports/batches/b1/progress' }).flush({});
        service.releaseReminders('b1', 7).subscribe();
        const req = http.expectOne('http://api.test/api/v1/imports/batches/b1/release-reminders');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ confirmEmailCount: 7 });
        req.flush({});
    });
});
