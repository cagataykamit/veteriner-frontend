import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { ClinicalSnippetError, ClinicalSnippetsService } from './clinical-snippets.service';

const URL = 'http://api.test/api/v1/clinical-snippets';
const dto: ClinicalSnippetDto = {
    id: 's1',
    shortcut: 'kusma',
    title: 'Kusma anamnezi',
    body: 'Kaç kez?\nİçerik?',
    isActive: true,
    createdAtUtc: '2026-11-01T10:00:00Z',
    updatedAtUtc: null,
    rowVersion: 'AAAAAAAAB9I='
};
const paged = (items: ClinicalSnippetDto[]) => ({ items, page: 1, pageSize: 200, totalItems: items.length, totalPages: 1 });

describe('ClinicalSnippetsService', () => {
    let service: ClinicalSnippetsService;
    let http: HttpTestingController;
    let clinicId: string;

    beforeEach(() => {
        clinicId = 'clinic-1';
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => clinicId } }
            ]
        });
        service = TestBed.inject(ClinicalSnippetsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste sorgusu yalnız dolu parametreleri gönderir; DTO aynen gelir', () => {
        let items: ClinicalSnippetDto[] = [];

        service.list({ search: '  kus ', includeInactive: true, page: 2, pageSize: 50 }).subscribe((r) => (items = r.items));
        const req = http.expectOne((r) => r.url === URL);

        expect(req.request.params.get('search')).toBe('kus');
        expect(req.request.params.get('includeInactive')).toBe('true');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('50');
        req.flush(paged([dto]));
        expect(items).toEqual([dto]);

        service.list({ search: ' ' }).subscribe();
        const plain = http.expectOne((r) => r.url === URL);

        expect(plain.request.params.keys()).toEqual([]);
        plain.flush(paged([]));
    });

    it('ekleme ve düzenleme gövdesi sözleşmeye uyar', () => {
        const request = { shortcut: '#kusma', title: 'Kusma anamnezi', body: 'Kaç kez?' };

        service.create(request).subscribe();
        const post = http.expectOne(URL);

        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual(request);
        post.flush(dto);

        service.update('s1', request, 'AAAAAAAAB9I=').subscribe();
        const put = http.expectOne(`${URL}/s1`);

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ ...request, rowVersion: 'AAAAAAAAB9I=' });
        put.flush(dto);
    });

    it('pasifleştir / etkinleştir ayrı uçlara gider', () => {
        service.setActive('s1', false).subscribe();
        http.expectOne(`${URL}/s1/deactivate`).flush(null, { status: 204, statusText: 'No Content' });
        service.setActive('s1', true).subscribe();
        http.expectOne(`${URL}/s1/activate`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('aktif liste tek istekte (pageSize=200) çekilir ve önbellekten paylaşılır; yazma ve klinik değişimi önbelleği düşürür', () => {
        const received: ClinicalSnippetDto[][] = [];

        service.activeSnippets().subscribe((x) => received.push(x));
        const req = http.expectOne((r) => r.url === URL);

        expect(req.request.params.get('pageSize')).toBe('200');
        expect(req.request.params.has('includeInactive')).toBe(false);
        req.flush(paged([dto]));
        service.activeSnippets().subscribe((x) => received.push(x));
        http.expectNone((r) => r.url === URL);
        expect(received).toEqual([[dto], [dto]]);

        service.setActive('s1', false).subscribe();
        http.expectOne(`${URL}/s1/deactivate`).flush(null, { status: 204, statusText: 'No Content' });
        service.activeSnippets().subscribe();
        http.expectOne((r) => r.url === URL).flush(paged([]));

        clinicId = 'clinic-2';
        service.activeSnippets().subscribe();
        http.expectOne((r) => r.url === URL).flush(paged([]));
    });

    it('aktif liste hatası önbelleğe alınmaz', () => {
        service.activeSnippets().subscribe({ error: () => undefined });
        http.expectOne((r) => r.url === URL).flush({ status: 500 }, { status: 500, statusText: 'Server Error' });
        service.activeSnippets().subscribe();
        http.expectOne((r) => r.url === URL).flush(paged([dto]));
    });

    it('409 kodları anlaşılır mesaja çevrilir; eşzamanlılık çakışması işaretlenir', () => {
        let conflict: ClinicalSnippetError | undefined;

        service.update('s1', { shortcut: 'kusma', title: 'X', body: 'Y' }, 'V1').subscribe({ error: (e: ClinicalSnippetError) => (conflict = e) });
        http.expectOne(`${URL}/s1`).flush({ status: 409, code: 'ClinicalSnippets.ConcurrencyConflict' }, { status: 409, statusText: 'Conflict' });
        expect(conflict?.isConflict).toBe(true);

        let duplicate: ClinicalSnippetError | undefined;

        service.create({ shortcut: '#İshal', title: 'X', body: 'Y' }).subscribe({ error: (e: ClinicalSnippetError) => (duplicate = e) });
        http.expectOne(URL).flush({ status: 409, extensions: { code: 'ClinicalSnippets.DuplicateShortcut' } }, { status: 409, statusText: 'Conflict' });
        expect(duplicate?.isConflict).toBe(false);
        expect(duplicate?.code).toBe('ClinicalSnippets.DuplicateShortcut');
        expect(duplicate?.message).toContain('kısayol zaten');

        let limit: ClinicalSnippetError | undefined;

        service.create({ shortcut: 'yeni', title: 'X', body: 'Y' }).subscribe({ error: (e: ClinicalSnippetError) => (limit = e) });
        http.expectOne(URL).flush({ status: 409, code: 'ClinicalSnippets.LimitReached' }, { status: 409, statusText: 'Conflict' });
        expect(limit?.message).toContain('200');
    });
});
