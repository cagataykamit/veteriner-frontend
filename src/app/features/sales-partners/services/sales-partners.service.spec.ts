import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { DiscountCodesService, discountCodeErrorMessage } from './discount-codes.service';
import { SalesPartnersService } from './sales-partners.service';

describe('SalesPartnersService ve DiscountCodesService (ADR-037)', () => {
    let partners: SalesPartnersService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        partners = TestBed.inject(SalesPartnersService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('yönetim uçları sözleşmedeki yollara gider', () => {
        partners.list().subscribe();
        http.expectOne('http://api.test/api/v1/admin/sales-partners').flush([]);

        partners.createCode('p1', { code: 'ISIK10', discountPercent: 10, commissionPercent: 20, validFromUtc: null, validUntilUtc: null, maxRedemptions: null }).subscribe();
        const create = http.expectOne('http://api.test/api/v1/admin/sales-partners/p1/codes');

        expect(create.request.method).toBe('POST');
        expect(create.request.body.code).toBe('ISIK10');
        create.flush({});

        partners.setCodeActive('p1', 'c1', false).subscribe();
        http.expectOne('http://api.test/api/v1/admin/sales-partners/p1/codes/c1/deactivate').flush({});

        let updated = 0;

        partners.markPaid('p1', ['x1', 'x2'], '2026-11-30T09:00:00.000Z', 'Havale').subscribe((n) => (updated = n));
        const paid = http.expectOne('http://api.test/api/v1/admin/sales-partners/p1/commissions/mark-paid');

        expect(paid.request.body).toEqual({ collectionIds: ['x1', 'x2'], paidAtUtc: '2026-11-30T09:00:00.000Z', note: 'Havale' });
        paid.flush({ updatedCount: 2 });

        expect(updated).toBe(2);

        partners.exportCsv('p1').subscribe();
        const csv = http.expectOne((r) => r.url === 'http://api.test/api/v1/admin/sales-partners/export.csv');

        expect(csv.request.params.get('partnerId')).toBe('p1');
        expect(csv.request.responseType).toBe('blob');
        csv.flush(new Blob(['x']));
    });

    it('çakışma kodlarını Türkçe mesaja çevirir', () => {
        let message = '';

        partners.createCode('p1', { code: 'ISIK10', discountPercent: 10, commissionPercent: 20, validFromUtc: null, validUntilUtc: null, maxRedemptions: null }).subscribe({
            error: (e: Error) => (message = e.message)
        });
        http.expectOne('http://api.test/api/v1/admin/sales-partners/p1/codes').flush(
            { status: 409, extensions: { code: 'DiscountCodes.DuplicateCode' } },
            { status: 409, statusText: 'Conflict' }
        );

        expect(message).toContain('zaten kullanılıyor');
    });

    it('anonim doğrulama gövdesi yalnız kodu taşır; kiracı kodu JWT kiracısına gider', () => {
        const codes = TestBed.inject(DiscountCodesService);

        spyOn(TestBed.inject(AuthService), 'getAccessToken').and.returnValue(jwtWithTenant('t-1'));

        codes.validate('ISIK10').subscribe();
        const validate = http.expectOne('http://api.test/api/v1/public/discount-codes/validate');

        expect(validate.request.body).toEqual({ code: 'ISIK10' });
        validate.flush({ valid: false, code: null, discountPercent: null, discountMonths: null });

        codes.applySubscriptionDiscount('ISIK10').subscribe({ error: () => undefined });
        http.expectOne('http://api.test/api/v1/tenants/t-1/subscription-discount').flush(
            { status: 409, extensions: { code: 'DiscountCodes.ApplyNotOpen' } },
            { status: 409, statusText: 'Conflict' }
        );
    });

    it('kod hataları tek tip metne çevrilir', () => {
        const invalid = new HttpErrorResponse({ status: 400, error: { extensions: { code: 'DiscountCodes.Invalid' } } });

        expect(discountCodeErrorMessage(invalid, 'x')).toBe('Ortak kodu geçersiz.');
    });
});

function jwtWithTenant(tenantId: string): string {
    const payload = btoa(JSON.stringify({ tenant_id: tenantId, sub: 'u1' })).replace(/=+$/, '');

    return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}
