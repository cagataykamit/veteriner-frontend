import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { TrialLimitError } from '@/app/shared/utils/api-error.utils';
import { StoredFilesService } from './stored-files.service';

describe('StoredFilesService — yükleme hataları', () => {
    let service: StoredFilesService;
    let http: HttpTestingController;
    const owner = '/api/v1/lab-results/l1';
    const file = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'a.jpg', { type: 'image/jpeg' });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(StoredFilesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('422 Trial.StorageQuotaExceeded sunucu metniyle TrialLimitError olur (TRIAL-006)', () =>
        new Promise<void>((done) => {
            const detail = 'Deneme sürümünde dosya depolama 500 MB sınırı doldu; abonelikle kalkar.';

            service.upload(owner, file()).subscribe({
                error: (e: unknown) => {
                    expect(e).toBeInstanceOf(TrialLimitError);
                    expect((e as TrialLimitError).code).toBe('Trial.StorageQuotaExceeded');
                    expect((e as Error).message).toBe(detail);
                    done();
                }
            });
            http.expectOne((r) => r.method === 'POST').flush({ status: 422, detail, code: 'Trial.StorageQuotaExceeded' }, { status: 422, statusText: 'Unprocessable Entity' });
        }));

    it('diğer yükleme hataları düz Error kalır', () =>
        new Promise<void>((done) => {
            service.upload(owner, file()).subscribe({
                error: (e: unknown) => {
                    expect(e).not.toBeInstanceOf(TrialLimitError);
                    expect(e).toBeInstanceOf(Error);
                    done();
                }
            });
            http.expectOne((r) => r.method === 'POST').flush({ status: 503, detail: 'Depo kullanılamıyor.' }, { status: 503, statusText: 'Service Unavailable' });
        }));
});
