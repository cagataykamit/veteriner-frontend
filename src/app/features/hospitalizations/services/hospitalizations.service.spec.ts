import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { CreateHospitalizationRequest } from '@/app/features/hospitalizations/models/hospitalization-create.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';

const URL = 'http://api.test/api/v1/hospitalizations/h1';

const update: CreateHospitalizationRequest = {
    clinicId: 'c1',
    petId: 'p1',
    admittedAtUtc: '2026-10-13T08:00:00Z',
    reason: 'Dehidrasyon',
    notes: 'Giriş notu',
    location: '',
    rowVersion: 'AAAAAAAAB9E='
};

describe('HospitalizationsService', () => {
    let service: HospitalizationsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'c1' } }]
        });
        service = TestBed.inject(HospitalizationsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('PUT gövdesinde rowVersion ve konum gider; 200 + {id,rowVersion} yeni sürümü döner', () =>
        new Promise<void>((done) => {
            service.updateHospitalization('h1', update).subscribe((r) => {
                expect(r).toEqual({ id: 'h1', rowVersion: 'AAAAAAAAB9I=' });
                done();
            });
            const req = http.expectOne(URL);

            expect(req.request.method).toBe('PUT');
            expect(req.request.body.rowVersion).toBe('AAAAAAAAB9E=');
            expect(req.request.body.location).toBe('');
            expect('visitId' in req.request.body).toBe(false);
            req.flush({ id: 'h1', rowVersion: 'AAAAAAAAB9I=' });
        }));

    it('PUT: konum null ise gönderilmez (dokunma), visitId verilirse gider', () =>
        new Promise<void>((done) => {
            service.updateHospitalization('h1', { ...update, location: null, visitId: 'v1' }).subscribe(() => done());
            const req = http.expectOne(URL);

            expect('location' in req.request.body).toBe(false);
            expect(req.request.body.visitId).toBe('v1');
            req.flush({ id: 'h1', rowVersion: 'x' });
        }));

    it('PUT: oda seçildiyse roomId gider, clearRoom ve location gitmez (HOSP-002)', () =>
        new Promise<void>((done) => {
            service.updateHospitalization('h1', { ...update, location: null, roomId: 'r1', clearRoom: false }).subscribe(() => done());
            const req = http.expectOne(URL);

            expect(req.request.body.roomId).toBe('r1');
            expect('clearRoom' in req.request.body).toBe(false);
            expect('location' in req.request.body).toBe(false);
            req.flush({ id: 'h1', rowVersion: 'x' });
        }));

    it('PUT: "Konum yok" seçimi clearRoom:true ve boş location gönderir, roomId gitmez', () =>
        new Promise<void>((done) => {
            service.updateHospitalization('h1', { ...update, location: '', roomId: null, clearRoom: true }).subscribe(() => done());
            const req = http.expectOne(URL);

            expect(req.request.body.clearRoom).toBe(true);
            expect(req.request.body.location).toBe('');
            expect('roomId' in req.request.body).toBe(false);
            req.flush({ id: 'h1', rowVersion: 'x' });
        }));

    it('PUT 409 ham HttpErrorResponse olarak iletilir (çakışma kodu ayrıştırılabilsin)', () =>
        new Promise<void>((done) => {
            service.updateHospitalization('h1', update).subscribe({
                error: (e: unknown) => {
                    expect(e instanceof HttpErrorResponse).toBe(true);
                    expect((e as HttpErrorResponse).status).toBe(409);
                    done();
                }
            });
            http.expectOne(URL).flush({ extensions: { code: 'Hospitalizations.ConcurrencyConflict' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('taburcu: dischargeNote ve rowVersion gider, eski notes alanı gitmez; 200 yanıtı okunur', () =>
        new Promise<void>((done) => {
            service.dischargeHospitalization('h1', { dischargedAtUtc: '2026-10-14T08:00:00Z', dischargeNote: ' Eve gitti ', rowVersion: 'AAAAAAAAB9E=' }).subscribe((r) => {
                expect(r.rowVersion).toBe('AAAAAAAAB9M=');
                done();
            });
            const req = http.expectOne(`${URL}/discharge`);

            expect(req.request.body).toEqual({ dischargedAtUtc: '2026-10-14T08:00:00Z', dischargeNote: 'Eve gitti', rowVersion: 'AAAAAAAAB9E=' });
            req.flush({ id: 'h1', rowVersion: 'AAAAAAAAB9M=' });
        }));

    it('düzenleme verisi rowVersion ve geliş/konum taşır; sunucu rowVersion döndürmezse düzenleme reddedilir', () =>
        new Promise<void>((done) => {
            service.getHospitalizationForEditById('h1').subscribe((vm) => {
                expect(vm.rowVersion).toBe('AAAAAAAAB9E=');
                expect(vm.visitId).toBe('v1');
                expect(vm.location).toBe('Kafes 3');
                service.getHospitalizationForEditById('h1').subscribe({
                    error: (e: Error) => {
                        expect(e.message).toContain('rowVersion');
                        done();
                    }
                });
                http.expectOne(URL).flush({ id: 'h1', isActive: true });
            });
            http.expectOne(URL).flush({ id: 'h1', visitId: 'v1', location: 'Kafes 3', isActive: true, rowVersion: 'AAAAAAAAB9E=' });
        }));

    it('detay: taburcu notu giriş notundan ayrı okunur', () =>
        new Promise<void>((done) => {
            service.getHospitalizationById('h1').subscribe((vm) => {
                expect(vm.notes).toBe('Giriş');
                expect(vm.dischargeNote).toBe('Çıkış');
                expect(vm.rowVersion).toBe('AAAAAAAAB9E=');
                done();
            });
            http.expectOne(URL).flush({ id: 'h1', notes: 'Giriş', dischargeNote: 'Çıkış', rowVersion: 'AAAAAAAAB9E=' });
        }));

    it('detay: odalı yatışta konum etiketi "Bölüm / Oda", düzenleme verisi roomId taşır', () =>
        new Promise<void>((done) => {
            service.getHospitalizationById('h1').subscribe((vm) => {
                expect(vm.roomId).toBe('r1');
                expect(vm.locationLabel).toBe('Yoğun bakım / Kafes 1');
                service.getHospitalizationForEditById('h1').subscribe((edit) => {
                    expect(edit.roomId).toBe('r1');
                    done();
                });
                http.expectOne(URL).flush({ id: 'h1', roomId: 'r1', roomName: 'Kafes 1', wardName: 'Yoğun bakım', isActive: true, rowVersion: 'AAAAAAAAB9E=' });
            });
            http.expectOne(URL).flush({ id: 'h1', roomId: 'r1', roomName: 'Kafes 1', wardName: 'Yoğun bakım', location: 'Eski metin', rowVersion: 'AAAAAAAAB9E=' });
        }));
});
