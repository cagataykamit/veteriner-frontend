import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMPLE_CLINIC_ALREADY_LOADED_CODE, EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE, ExampleClinicLoadError, ExampleClinicService } from './example-clinic.service';

describe('ExampleClinicService (TRIAL-002)', () => {
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
        const errors: ExampleClinicLoadError[] = [];

        service.load().subscribe({ error: (e: ExampleClinicLoadError) => errors.push(e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 409, extensions: { code: EXAMPLE_CLINIC_ALREADY_LOADED_CODE } }, { status: 409, statusText: 'Conflict' });

        service.load().subscribe({ error: (e: ExampleClinicLoadError) => errors.push(e) });
        http.expectOne('http://api.test/api/v1/tenants/t-1/example-clinic').flush({ status: 409, extensions: { code: EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE } }, { status: 409, statusText: 'Conflict' });

        expect(errors.length).toBe(2);
        expect(errors[0]).toBeInstanceOf(ExampleClinicLoadError);
        expect(errors[0].code).toBe(EXAMPLE_CLINIC_ALREADY_LOADED_CODE);
        expect(errors[0].isBlocking).toBeTrue();
        expect(errors[0].message).toContain('zaten müşteri ya da hasta kaydı var');
        expect(errors[1].isBlocking).toBeTrue();
        expect(errors[1].message).toContain('yalnız deneme süresinde');
    });

    it('403 Tenants.AccessDenied engelleyici değildir; mesaj kodu yansıtır', () => {
        let error: ExampleClinicLoadError | null = null;

        service.load().subscribe({ error: (e: ExampleClinicLoadError) => (error = e) });
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
});

function jwtWithTenant(tenantId: string): string {
    const payload = btoa(JSON.stringify({ tenant_id: tenantId, sub: 'u1' })).replace(/=+$/, '');

    return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}
