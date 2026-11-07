import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { defaultStoredConfig } from '@site-engine';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ClinicSiteService } from '@/app/features/clinic-site/services/clinic-site.service';
import { ClinicSiteError } from '@/app/features/clinic-site/utils/clinic-site-error.utils';

describe('ClinicSiteService', () => {
    let service: ClinicSiteService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '' }] });
        service = TestBed.inject(ClinicSiteService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('taslağı sözleşmedeki gövdeyle yazar', () => {
        const config = defaultStoredConfig();

        service.saveDraft('c1', config, 'r1').subscribe();

        const request = http.expectOne('/api/v1/clinics/c1/site/draft');

        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({ config, rowVersion: 'r1' });
        request.flush({});
    });

    it('adres uygunluğunu sorgu parametresiyle sorar', () => {
        service.checkAddress('c1', 'cagri vet').subscribe();
        http.expectOne((request) => request.url === '/api/v1/clinics/c1/site/address-availability' && request.params.get('slug') === 'cagri vet').flush({ slug: 'x', isAvailable: true, reason: null });
    });

    it('sürüme dönüş ve yayın sürüm numarası gönderir', () => {
        service.publish('c1', 'r1').subscribe();
        service.restoreVersion('c1', 3, 'r2').subscribe();

        const publish = http.expectOne('/api/v1/clinics/c1/site/publish');
        const restore = http.expectOne('/api/v1/clinics/c1/site/versions/3/restore');

        expect(publish.request.body).toEqual({ rowVersion: 'r1' });
        expect(restore.request.body).toEqual({ rowVersion: 'r2' });
        publish.flush({});
        restore.flush({});
    });

    it('görseli "file" alanıyla yükler, ilerleme bildirir, görsel kaydını döner', async () => {
        const progress = vi.fn();
        const result = firstValueFrom(service.uploadImage('c1', new File(['x'], 'a.webp', { type: 'image/webp' }), progress));
        const request = http.expectOne('/api/v1/clinics/c1/site/images');

        expect((request.request.body as FormData).get('file')).toBeInstanceOf(File);
        request.event({ type: 1, loaded: 50, total: 100 });
        request.flush({ id: 'g1', reference: 'site-image:g1' }, { status: 201, statusText: 'Created' });

        expect(progress).toHaveBeenCalledWith(50);
        expect((await result).reference).toBe('site-image:g1');
    });

    it.each([
        ['ClinicSites.ConcurrencyConflict', 409, 'değiştirildi'],
        ['Files.TooLarge', 413, '5 MB'],
        ['Files.UnsupportedType', 415, 'JPEG'],
        ['Files.LimitReached', 409, '100'],
        ['ClinicSites.SlugTaken', 409, 'kullanılıyor'],
        ['ClinicSites.AddressChangeLimitReached', 409, 'destekle iletişime geçin']
    ])('%s anlaşılır mesaja çevrilir', async (code, status, text) => {
        const result = firstValueFrom(service.saveDraft('c1', defaultStoredConfig(), null));

        http.expectOne('/api/v1/clinics/c1/site/draft').flush({ code }, { status, statusText: 'Hata' });
        await expect(result).rejects.toMatchObject({ code, message: expect.stringContaining(text) });
    });

    it('yayın eksiklerini ve görsel kullanım yerini hatadan taşır', async () => {
        const publish = firstValueFrom(service.publish('c1', 'r1'));

        http.expectOne('/api/v1/clinics/c1/site/publish').flush({ code: 'ClinicSites.PublishRequirementsNotMet', detail: 'Eksik.', missing: ['phone'], missingImageIds: ['g1'] }, { status: 409, statusText: 'Conflict' });

        const failure = (await publish.catch((err: unknown) => err)) as ClinicSiteError;

        expect(failure).toBeInstanceOf(ClinicSiteError);
        expect(failure.missing).toEqual(['phone']);
        expect(failure.missingImageIds).toEqual(['g1']);

        const remove = firstValueFrom(service.deleteImage('c1', 'g1'));

        http.expectOne('/api/v1/clinics/c1/site/images/g1').flush({ code: 'ClinicSites.ImageInUse', usedIn: ['published'] }, { status: 409, statusText: 'Conflict' });
        await expect(remove).rejects.toMatchObject({ usedIn: ['published'] });
    });
});
