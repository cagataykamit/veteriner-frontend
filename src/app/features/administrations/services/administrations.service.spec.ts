import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AdministrationDto } from '@/app/features/administrations/models/administration-api.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const dto: AdministrationDto = {
    id: 'a1',
    clinicId: 'c1',
    petId: 'p1',
    examinationId: 'e1',
    productId: 'pr1',
    productName: 'Serum',
    unit: 'şişe',
    quantity: 0.5,
    administeredAtUtc: '2026-10-13T08:00:00Z',
    status: 'Active',
    createdByUserId: 'u1',
    createdAtUtc: '2026-10-13T08:00:00Z'
};

const request = { petId: 'p1', examinationId: 'e1', productId: 'pr1', quantity: 0.5, requestId: 'rid-1' };

describe('AdministrationsService', () => {
    let service: AdministrationsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'c1' } }
            ]
        });
        service = TestBed.inject(AdministrationsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste: aktif klinik gider, iptaller varsayılan istenmez', (done) => {
        service.getAdministrations({ examinationId: 'e1' }).subscribe((r) => {
            expect(r.items[0].isVoided).toBeFalse();
            expect(r.items[0].examinationId).toBe('e1');
            done();
        });
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/administrations');

        expect(req.request.params.get('clinicId')).toBe('c1');
        expect(req.request.params.get('examinationId')).toBe('e1');
        expect(req.request.params.has('includeVoided')).toBeFalse();
        req.flush({ items: [dto], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    });

    it('liste: includeVoided true gönderilir ve iptal durumu eşlenir', (done) => {
        service.getAdministrations({ includeVoided: true }).subscribe((r) => {
            expect(r.items[0].isVoided).toBeTrue();
            done();
        });
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/administrations');

        expect(req.request.params.get('includeVoided')).toBe('true');
        req.flush({ items: [{ ...dto, status: 'Voided', voidReason: 'Yanlış ürün' }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    });

    it('ekleme 201: gövdede clinicId ve requestId var; stok bilgisi döner', (done) => {
        service.createAdministration(request).subscribe((r) => {
            expect(r.created).toBeTrue();
            expect(r.stock.isBelowMinimum).toBeTrue();
            expect(r.administration.unit).toBe('şişe');
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/administrations');

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            clinicId: 'c1',
            petId: 'p1',
            examinationId: 'e1',
            treatmentId: null,
            productId: 'pr1',
            quantity: 0.5,
            administeredAtUtc: null,
            notes: null,
            lateEntryReason: null,
            requestId: 'rid-1'
        });
        req.flush({ created: true, administration: dto, stock: { quantityOnHand: 1, minimumStockLevel: 5, isBelowMinimum: true } }, { status: 201, statusText: 'Created' });
    });

    it('ekleme 200 (aynı requestId): created false, hata değildir', (done) => {
        service.createAdministration(request).subscribe((r) => {
            expect(r.created).toBeFalse();
            done();
        });
        http.expectOne('http://api.test/api/v1/administrations').flush({
            created: false,
            administration: dto,
            stock: { quantityOnHand: 9, minimumStockLevel: 5, isBelowMinimum: false }
        });
    });

    it('klinik yoksa istek atılmaz', (done) => {
        TestBed.inject(AuthService).getClinicId = () => null;
        service.createAdministration(request).subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('Aktif klinik');
                done();
            }
        });
        http.expectNone('http://api.test/api/v1/administrations');
    });

    it('iptal: gerekçe kırpılarak /void a gider; varsayılan sonuç StockReturned, iptal edilmiş kayıt döner', (done) => {
        service.voidAdministration('a1', '  Yanlış ürün seçildi ').subscribe((r) => {
            expect(r.isVoided).toBeTrue();
            expect(r.voidStockOutcome).toBe('StockReturned');
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/administrations/a1/void');

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ reason: 'Yanlış ürün seçildi', stockOutcome: 'StockReturned' });
        req.flush({ ...dto, status: 'Voided', voidReason: 'Yanlış ürün seçildi', voidStockOutcome: 'StockReturned' });
    });

    it('iptal: zarar/imha seçimi stockOutcome=WrittenOff olarak gider ve yanıttan okunur', (done) => {
        service.voidAdministration('a1', 'Şişe kırıldı', 'WrittenOff').subscribe((r) => {
            expect(r.voidStockOutcome).toBe('WrittenOff');
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/administrations/a1/void');

        expect(req.request.body).toEqual({ reason: 'Şişe kırıldı', stockOutcome: 'WrittenOff' });
        req.flush({ ...dto, status: 'Voided', voidReason: 'Şişe kırıldı', voidStockOutcome: 'WrittenOff' });
    });

    it('ekleme: lateEntryReason gövdeye girer; sonradan ekleme alanları okunur', (done) => {
        service.createAdministration({ ...request, lateEntryReason: ' Unutulmuş ' }).subscribe((r) => {
            expect(r.administration.addedAfterFinalization).toBeTrue();
            expect(r.administration.lateEntryReason).toBe('Unutulmuş');
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/administrations');

        expect(req.request.body.lateEntryReason).toBe('Unutulmuş');
        req.flush({
            created: true,
            administration: { ...dto, addedAfterFinalization: true, lateEntryReason: 'Unutulmuş' },
            stock: { quantityOnHand: 1, minimumStockLevel: 0, isBelowMinimum: false }
        });
    });

    it('hata kodları Türkçe mesaja çevrilir', () => {
        const problem = (code: string, status: number) => new HttpErrorResponse({ status, error: { title: 'x', extensions: { code } } });
        const insufficient = new HttpErrorResponse({
            status: 400,
            error: { title: 'x', detail: 'Yetersiz bakiye: kullanılabilir 3, süresi geçmiş 5 (hariç)', extensions: { code: 'Administrations.InsufficientStock' } }
        });

        expect(messageFromHttpError(insufficient, 'f')).toBe('Yetersiz bakiye: kullanılabilir 3, süresi geçmiş 5 (hariç)');
        expect(messageFromHttpError(problem('Administrations.AlreadyVoided', 409), 'f')).toContain('zaten iptal');
        expect(messageFromHttpError(problem('Administrations.LateEntryReasonRequired', 400), 'f')).toContain('gerekçe');
        expect(messageFromHttpError(problem('Examinations.Finalized', 409), 'f')).toContain('kesinleştirilmiş');
        expect(messageFromHttpError(problem('StockMovements.ConcurrencyConflict', 409), 'f')).toContain('Tekrar deneyin');
    });
});
