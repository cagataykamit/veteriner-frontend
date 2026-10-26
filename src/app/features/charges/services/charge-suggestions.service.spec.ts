import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargeDto } from '@/app/features/charges/models/charge-api.model';
import type { ChargeSuggestionDto } from '@/app/features/charges/models/charge-suggestion-api.model';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';

const suggestion: ChargeSuggestionDto = {
    id: 's1',
    sourceType: 'Administration',
    sourceId: 'a1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    examinationId: 'e1',
    visitId: 'v1',
    productId: 'pr1',
    description: 'Serum fizyolojik',
    quantity: 2,
    unit: 'Adet',
    suggestedUnitPrice: 125,
    currency: 'TRY',
    occurredAtUtc: '2026-10-14T07:00:00Z',
    status: 'Pending'
};

const charge: ChargeDto = {
    id: 'ch1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    description: 'Serum fizyolojik',
    quantity: 2,
    unitPrice: 125,
    amount: 250,
    currency: 'TRY',
    createdByUserId: 'u1',
    createdAtUtc: '2026-10-14T08:00:00Z'
};

describe('ChargeSuggestionsService', () => {
    let service: ChargeSuggestionsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'c1' } }]
        });
        service = TestBed.inject(ChargeSuggestionsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste: aktif klinik ve bağlam süzgeçleri gider, kalem VM e eşlenir', () =>
        new Promise<void>((done) => {
            service.getPending({ page: 1, pageSize: 200, visitId: 'v1' }).subscribe((r) => {
                expect(r.totalItems).toBe(1);
                expect(r.items[0]).toEqual(expect.objectContaining({ id: 's1', clientName: 'Ali Veli', suggestedUnitPrice: 125, examinationId: 'e1', visitId: 'v1' }));
                done();
            });
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/charge-suggestions');

            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('clinicId')).toBe('c1');
            expect(req.request.params.get('visitId')).toBe('v1');
            expect(req.request.params.get('pageSize')).toBe('200');
            req.flush({ items: [suggestion], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 });
        }));

    it('fiyatı olmayan kalem suggestedUnitPrice null olarak gelir', () =>
        new Promise<void>((done) => {
            service.getPending().subscribe((r) => {
                expect(r.items[0].suggestedUnitPrice).toBeNull();
                done();
            });
            http.expectOne((r) => r.url === 'http://api.test/api/v1/charge-suggestions').flush({
                items: [{ ...suggestion, suggestedUnitPrice: null }],
                page: 1,
                pageSize: 20,
                totalItems: 1,
                totalPages: 1
            });
        }));

    it('tek tık çevirme: gövdede yalnız requestId var (alanlar kalemden gelir); 201 created:true', () =>
        new Promise<void>((done) => {
            service.convert('s1', { requestId: 'rid-1' }).subscribe((r) => {
                expect(r.created).toBe(true);
                expect(r.charge.id).toBe('ch1');
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/charge-suggestions/s1/convert');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ requestId: 'rid-1' });
            req.flush({ created: true, charge }, { status: 201, statusText: 'Created' });
        }));

    it('düzenleyerek çevirme: yalnız verilen alanlar gider, açıklama kırpılır', () =>
        new Promise<void>((done) => {
            service.convert('s1', { description: ' Serum ', unitPrice: 130, requestId: 'rid-2' }).subscribe(() => done());
            const req = http.expectOne('http://api.test/api/v1/charge-suggestions/s1/convert');

            expect(req.request.body).toEqual({ description: 'Serum', unitPrice: 130, requestId: 'rid-2' });
            req.flush({ created: true, charge }, { status: 201, statusText: 'Created' });
        }));

    it('aynı requestId ile tekrar (200): hata değil, created:false ile ilk ücret döner', () =>
        new Promise<void>((done) => {
            service.convert('s1', { requestId: 'rid-1' }).subscribe({
                next: (r) => {
                    expect(r.created).toBe(false);
                    expect(r.charge.id).toBe('ch1');
                    done();
                },
                error: () => expect.fail('200 yanıtı hata sayılmamalı')
            });
            http.expectOne('http://api.test/api/v1/charge-suggestions/s1/convert').flush({ created: false, charge }, { status: 200, statusText: 'OK' });
        }));

    it('409 AlreadyConverted Türkçe mesaja çevrilir', () =>
        new Promise<void>((done) => {
            service.convert('s1', { requestId: 'rid-3' }).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('zaten ücrete çevrilmiş');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/charge-suggestions/s1/convert').flush({ title: 'Conflict', extensions: { code: 'ChargeSuggestions.AlreadyConverted' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('ücretsiz sayma: gerekçe kırpılarak gider', () =>
        new Promise<void>((done) => {
            service.waive('s1', '  Hasta sahibine bedelsiz verildi ').subscribe((r) => {
                expect(r.id).toBe('s1');
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/charge-suggestions/s1/waive');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: 'Hasta sahibine bedelsiz verildi' });
            req.flush({ ...suggestion, status: 'Waived', waiveReason: 'Hasta sahibine bedelsiz verildi' });
        }));
});
