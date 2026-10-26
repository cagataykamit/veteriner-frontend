import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMPLE_CLINIC_ALREADY_LOADED_CODE, EXAMPLE_CLINIC_NOT_LOADED_CODE, EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE, ExampleClinicError, ExampleClinicService } from './example-clinic.service';

describe('ExampleClinicService (TRIAL-002, örnek veri temizliği)', () => {
    let service: ExampleClinicService;
    let http: HttpTestingController;
    let auth: AuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(ExampleClinicService);
        http = TestBed.inject(HttpTestingController);
        auth = TestBed.inject(AuthService);
        spyOn(auth, 'getAccessToken').and.returnValue(jwtWithTenant('t-1'));
    });

    afterEach(() => http.verify());

    it('JWT kiracısının example-clinic ucuna gövdesiz POST atar ve özeti döner', () => {
        let clients = 0;

        service.load().subscribe((s) => (clients = s.clients));
        const req = http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic');

        expect(req.request.method).toBe('POST');
        req.flush({ tenantId: 't-1', clinicId: 'c1', clients: 12, pets: 20 });

        expect(clients).toBe(12);
    });

    it('409 kodlarını kullanıcı mesajına çevirir ve engelleyici olarak işaretler', () => {
        const errors: ExampleClinicError[] = [];

        service.load().subscribe({ error: (e: ExampleClinicError) => errors.push(e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 409, extensions: { code: EXAMPLE_CLINIC_ALREADY_LOADED_CODE } }, { status: 409, statusText: 'Conflict' });

        service.load().subscribe({ error: (e: ExampleClinicError) => errors.push(e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 409, extensions: { code: EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE } }, { status: 409, statusText: 'Conflict' });

        expect(errors.length).toBe(2);
        expect(errors[0]).toBeInstanceOf(ExampleClinicError);
        expect(errors[0].code).toBe(EXAMPLE_CLINIC_ALREADY_LOADED_CODE);
        expect(errors[0].isBlocking).toBeTrue();
        expect(errors[0].message).toContain('zaten müşteri ya da hasta kaydı var');
        expect(errors[1].isBlocking).toBeTrue();
        expect(errors[1].message).toContain('yalnız deneme süresinde');
    });

    it('403 Tenants.AccessDenied engelleyici değildir; mesaj kodu yansıtır', () => {
        let error: ExampleClinicError | null = null;

        service.load().subscribe({ error: (e: ExampleClinicError) => (error = e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 403, extensions: { code: 'Tenants.AccessDenied' } }, { status: 403, statusText: 'Forbidden' });

        expect(error!.isBlocking).toBeFalse();
        expect(error!.message).toBe('Bu kuruma erişim yetkiniz bulunmuyor.');
    });

    it('kiracı okunamazsa istek atmadan hata döner', () => {
        (auth.getAccessToken as jasmine.Spy).and.returnValue(null);
        let message = '';

        service.load().subscribe({ error: (e: Error) => (message = e.message) });

        expect(message).toContain('Kurum bilgisi okunamadı');
        http.expectNone('http://api.test/api/v1/tenants/t-1/example-clinic');
    });

    it('durum: JWT kiracısının example-clinic ucuna GET atar', () => {
        let hasExampleData = false;
        let clients = 0;

        service.getStatus().subscribe((s) => {
            hasExampleData = s.hasExampleData;
            clients = s.counts.clients;
        });
        const req = http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic');

        expect(req.request.method).toBe('GET');
        req.flush({ hasExampleData: true, counts: { clients: 12, pets: 20 } });

        expect(hasExampleData).toBeTrue();
        expect(clients).toBe(12);
    });

    it('temizlik: DELETE atar ve silinen sayıları döner', () => {
        let products = -1;

        service.clear().subscribe((c) => (products = c.products));
        const req = http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic');

        expect(req.request.method).toBe('DELETE');
        req.flush({ clients: 12, pets: 20, products: 9, productsDeactivated: 1 });

        expect(products).toBe(9);
    });

    it('temizlik 409 NotLoaded: isNotLoaded işaretlenir, yükleme engeli sayılmaz', () => {
        let error: ExampleClinicError | null = null;

        service.clear().subscribe({ error: (e: ExampleClinicError) => (error = e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 409, extensions: { code: EXAMPLE_CLINIC_NOT_LOADED_CODE } }, { status: 409, statusText: 'Conflict' });

        expect(error!.isNotLoaded).toBeTrue();
        expect(error!.isBlocking).toBeFalse();
        expect(error!.message).toContain('temizlenecek örnek veri kalmamış');
    });

    it('temizlik 403 salt okunur: kullanıcı mesajı döner', () => {
        let error: ExampleClinicError | null = null;

        service.clear().subscribe({ error: (e: ExampleClinicError) => (error = e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 403, extensions: { code: 'Subscriptions.TenantReadOnly' } }, { status: 403, statusText: 'Forbidden' });

        expect(error!.isNotLoaded).toBeFalse();
        expect(error!.message).toContain('salt okunur');
    });
});

function jwtWithTenant(tenantId: string): string {
    const payload = btoa(JSON.stringify({ tenant_id: tenantId, sub: 'u1' })).replace(/=+$/, '');

    return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}
