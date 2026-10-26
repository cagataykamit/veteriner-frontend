import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { mapQuickRegisterFormsToRequest, mapQuickRegisterResultDtoToVm, mapQuickRegisterToApiBody } from '@/app/features/clients/data/client.mapper';
import { ClientsService } from '@/app/features/clients/services/clients.service';

describe('hızlı kayıt — mapper', () => {
    it('form değerleri kırpılır; e-posta/adres isteğe girmez; boş mikroçip gönderilmez', () => {
        const req = mapQuickRegisterFormsToRequest({ fullName: ' Ali Veli ', phone: ' 0555 111 22 33 ' }, { name: ' Pamuk ', speciesId: ' s1 ', microchipNumber: '  ' });

        expect(req).toEqual({ fullName: 'Ali Veli', phone: '0555 111 22 33', petName: 'Pamuk', speciesId: 's1', microchipNumber: undefined });
        expect(mapQuickRegisterToApiBody(req)).toEqual({ fullName: 'Ali Veli', phone: '0555 111 22 33', petName: 'Pamuk', speciesId: 's1' });
    });

    it('mikroçip doluysa gövdede gider', () => {
        expect(mapQuickRegisterToApiBody({ fullName: 'A B', phone: '05551112233', petName: 'P', speciesId: 's', microchipNumber: ' 985121001234567 ' }).microchipNumber).toBe('985121001234567');
    });

    it('yanıtta iki kimlik de yoksa null', () => {
        expect(mapQuickRegisterResultDtoToVm({ clientId: 'c1', petId: 'p1' })).toEqual({ clientId: 'c1', petId: 'p1' });
        expect(mapQuickRegisterResultDtoToVm({ clientId: 'c1' })).toBeNull();
        expect(mapQuickRegisterResultDtoToVm(null)).toBeNull();
    });
});

describe('ClientsService.quickRegister', () => {
    let service: ClientsService;
    let http: HttpTestingController;
    const request = { fullName: 'Ali Veli', phone: '0555 111 22 33', petName: 'Pamuk', speciesId: 's1' };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(ClientsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('201: POST quick-register gövdesi gider, clientId ve petId döner', () =>
        new Promise<void>((done) => {
            service.quickRegister(request).subscribe((r) => {
                expect(r).toEqual({ clientId: 'c1', petId: 'p1' });
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/clients/quick-register');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ clientId: 'c1', petId: 'p1' }, { status: 201, statusText: 'Created' });
        }));

    it('409 Clients.DuplicateClient ham HttpErrorResponse olarak iletilir (kod ayrıştırılabilsin)', () =>
        new Promise<void>((done) => {
            service.quickRegister(request).subscribe({
                next: () => expect.fail('hata bekleniyordu'),
                error: (e: unknown) => {
                    expect(e).toBeInstanceOf(HttpErrorResponse);
                    expect((e as HttpErrorResponse).status).toBe(409);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/clients/quick-register').flush({ status: 409, extensions: { code: 'Clients.DuplicateClient' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('403 ham iletilir', () =>
        new Promise<void>((done) => {
            service.quickRegister(request).subscribe({
                next: () => expect.fail('hata bekleniyordu'),
                error: (e: unknown) => {
                    expect((e as HttpErrorResponse).status).toBe(403);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/clients/quick-register').flush(null, { status: 403, statusText: 'Forbidden' });
        }));

    it('yanıtta kimlik eksikse açık hata verir', () =>
        new Promise<void>((done) => {
            service.quickRegister(request).subscribe({
                next: () => expect.fail('hata bekleniyordu'),
                error: (e: unknown) => {
                    expect((e as Error).message).toContain('kimliği okunamadı');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/clients/quick-register').flush({ clientId: 'c1' }, { status: 201, statusText: 'Created' });
        }));
});
