import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargeDto } from '@/app/features/charges/models/charge-api.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const charge: ChargeDto = {
    id: 'ch1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    description: 'Genel muayene',
    quantity: 1,
    unitPrice: 750,
    amount: 750,
    currency: 'TRY',
    createdByUserId: 'u1',
    createdAtUtc: '2026-10-10T07:00:00Z'
};

const request = { clientId: 'cl1', description: 'Genel muayene', quantity: 1, unitPrice: 750, requestId: 'rid-1' };

describe('ChargesService', () => {
    let service: ChargesService;
    let http: HttpTestingController;
    let clinicId: string | null;

    beforeEach(() => {
        clinicId = 'c1';
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => clinicId } }]
        });
        service = TestBed.inject(ChargesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste: aktif klinik clinicId olarak gider, sonuç VM e eşlenir', () =>
        new Promise<void>((done) => {
            service.getCharges({ clientId: 'cl1', page: 2, pageSize: 10 }).subscribe((r) => {
                expect(r.items.length).toBe(1);
                expect(r.totalItems).toBe(11);
                done();
            });
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/charges');

            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('clinicId')).toBe('c1');
            expect(req.request.params.get('clientId')).toBe('cl1');
            expect(req.request.params.get('page')).toBe('2');
            req.flush({ items: [charge], page: 2, pageSize: 10, totalItems: 11, totalPages: 2 });
        }));

    it('liste hatası Türkçe mesajlı Error olur', () =>
        new Promise<void>((done) => {
            service.getCharges().subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe('Ücretleri görmek için önce bir klinik seçmelisiniz.');
                    done();
                }
            });
            http.expectOne((r) => r.url === 'http://api.test/api/v1/charges').flush({ title: 'Bad Request', extensions: { code: 'Charges.ClinicScopeRequired' } }, { status: 400, statusText: 'Bad Request' });
        }));

    it('ekleme 201: gövdede clinicId ve requestId var, tutar/para birimi yok; created:true', () =>
        new Promise<void>((done) => {
            service.createCharge(request).subscribe((r) => {
                expect(r.created).toBe(true);
                expect(r.charge.id).toBe('ch1');
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/charges');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                clinicId: 'c1',
                clientId: 'cl1',
                petId: null,
                visitId: null,
                examinationId: null,
                description: 'Genel muayene',
                quantity: 1,
                unitPrice: 750,
                requestId: 'rid-1'
            });
            req.flush({ created: true, charge }, { status: 201, statusText: 'Created' });
        }));

    it('ekleme 200 (aynı requestId): hata değil, created:false ile ilk kayıt döner', () =>
        new Promise<void>((done) => {
            service.createCharge(request).subscribe({
                next: (r) => {
                    expect(r.created).toBe(false);
                    expect(r.charge.id).toBe('ch1');
                    done();
                },
                error: () => expect.fail('200 yanıtı hata sayılmamalı')
            });
            http.expectOne('http://api.test/api/v1/charges').flush({ created: false, charge }, { status: 200, statusText: 'OK' });
        }));

    it('ekleme 400 tutarlılık hatası Türkçe mesaja çevrilir', () =>
        new Promise<void>((done) => {
            service.createCharge(request).subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe('Geliş kaydındaki hasta bu müşteriye ait değil.');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/charges').flush({ title: 'Bad Request', extensions: { code: 'Charges.VisitClientMismatch' } }, { status: 400, statusText: 'Bad Request' });
        }));

    it('aktif klinik yoksa istek atmadan hata verir', () =>
        new Promise<void>((done) => {
            clinicId = null;
            service.createCharge(request).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('Aktif klinik bulunamadı');
                    done();
                }
            });
            http.expectNone('http://api.test/api/v1/charges');
        }));

    it('düzeltme: PUT gövdesi kırpılmış alanlar ve gerekçeyle gider, güncel ücret döner', () =>
        new Promise<void>((done) => {
            service.correctCharge('ch1', { description: ' Genel muayene ', quantity: 1, unitPrice: 600, reason: ' Fiyat yanlış okundu ' }).subscribe((r) => {
                expect(r.amount).toBe(600);
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/charges/ch1');

            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ description: 'Genel muayene', quantity: 1, unitPrice: 600, reason: 'Fiyat yanlış okundu' });
            req.flush({ ...charge, unitPrice: 600, amount: 600 });
        }));

    it('düzeltme 409 tahsis altı: Türkçe mesajlı Error', () =>
        new Promise<void>((done) => {
            service.correctCharge('ch1', { description: 'x', quantity: 1, unitPrice: 1, reason: 'yanlış tutar' }).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('ödemelerin toplamının altında');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/charges/ch1').flush({ title: 'Conflict', extensions: { code: 'Charges.CorrectionBelowAllocated' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('iptal: POST void ucuna yalnız kırpılmış gerekçe gider; 204 boş döner', () =>
        new Promise<void>((done) => {
            service.voidCharge('ch1', ' Yanlış girildi ').subscribe((r) => {
                expect(r).toBeUndefined();
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/charges/ch1/void');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: 'Yanlış girildi' });
            req.flush(null, { status: 204, statusText: 'No Content' });
        }));

    it('iptal 409 tahsisli ücret: önce ödemeyi iptal etme yönlendirmesi', () =>
        new Promise<void>((done) => {
            service.voidCharge('ch1', 'Yanlış girildi').subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('Önce ilgili ödemeyi iptal edin');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/charges/ch1/void').flush({ title: 'Conflict', extensions: { code: 'Charges.VoidBlockedByAllocation' } }, { status: 409, statusText: 'Conflict' });
        }));
});

describe('Charge hata kodları (messageFromHttpError)', () => {
    const codes = [
        'Charges.NotFound',
        'Charges.ClinicScopeRequired',
        'Charges.ClinicContextMismatch',
        'Clients.NotFound',
        'Pets.NotFound',
        'Examinations.NotFound',
        'Charges.PetClientMismatch',
        'Charges.VisitVoided',
        'Charges.VisitClinicMismatch',
        'Charges.VisitClientMismatch',
        'Charges.VisitPetMismatch',
        'Charges.ExaminationClinicMismatch',
        'Charges.ExaminationClientMismatch',
        'Charges.ExaminationPetMismatch',
        'Charges.ExaminationVisitMismatch',
        'Charges.VoidBlockedByAllocation',
        'Charges.CorrectionBelowAllocated',
        'Charges.AlreadyVoided',
        'Charges.RequestIdVoided',
        'Charges.ConcurrencyConflict',
        'Payments.NotFound',
        'Payments.AlreadyVoided',
        'Payments.RequestIdVoided',
        'Payments.ConcurrencyConflict'
    ];

    for (const code of codes) {
        it(`${code} için Türkçe, ham kod içermeyen mesaj verir`, () => {
            const err = new HttpErrorResponse({ status: 400, error: { title: 'Bad Request', extensions: { code } } });
            const msg = messageFromHttpError(err, 'varsayılan');

            expect(msg).not.toBe('varsayılan');
            expect(msg).not.toMatch(/Charges\.|Payments\./);
            expect(msg.endsWith('.')).toBe(true);
        });
    }

    it('Charges.Validation backend detail ını gösterir', () => {
        const err = new HttpErrorResponse({
            status: 400,
            error: { title: 'Bad Request', detail: 'Miktar sıfırdan büyük olmalıdır.', extensions: { code: 'Charges.Validation' } }
        });

        expect(messageFromHttpError(err)).toBe('Miktar sıfırdan büyük olmalıdır.');
    });
});
