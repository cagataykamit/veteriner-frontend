import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { PublicPlanCatalogService } from './public-plan-catalog.service';

const URL = 'http://api.test/api/v1/public/subscription-plans';

describe('PublicPlanCatalogService (WEB-007)', () => {
    let http: HttpTestingController;
    let service: PublicPlanCatalogService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(PublicPlanCatalogService);
    });

    afterEach(() => http.verify());

    it('katalog bir kez okunur; yüklenirken ve geldikten sonra yeniden istenmez', () => {
        expect(service.state().status).toBe('loading');

        service.ensureLoaded();
        service.ensureLoaded();
        http.expectOne(URL).flush({ currency: 'TRY', vatIncluded: false, yearlyBilledMonths: 10, plans: [{ planCode: 'Pro', maxUsers: 10, monthlyPriceMinor: 249000, yearlyPriceMinor: 2490000 }] });

        const state = service.state();

        expect(state.status === 'ready' ? state.catalog.plans[0].monthlyPriceTry : null).toBe(2490);
        service.ensureLoaded();
        http.expectNone(URL);
    });

    it('ulaşılamazsa hata durumu; sonraki çağrı yeniden dener', () => {
        service.ensureLoaded();
        http.expectOne(URL).error(new ProgressEvent('error'));

        expect(service.state().status).toBe('error');

        service.ensureLoaded();

        expect(service.state().status).toBe('loading');
        http.expectOne(URL).flush({ currency: 'TRY', yearlyBilledMonths: 10, plans: [] });

        expect(service.state().status).toBe('ready');
    });

    it('kullanılamayan yanıt (TRY dışı) hata sayılır', () => {
        service.ensureLoaded();
        http.expectOne(URL).flush({ currency: 'EUR', yearlyBilledMonths: 10, plans: [] });

        expect(service.state().status).toBe('error');
    });
});
