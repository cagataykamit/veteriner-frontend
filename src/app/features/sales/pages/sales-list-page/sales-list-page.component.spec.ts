import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapPagedSalesToVm } from '@/app/features/sales/data/sale.mapper';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { SalesListPageComponent } from './sales-list-page.component';

const paged = (over: { voided?: boolean } = {}) =>
    mapPagedSalesToVm({
        items: [
            {
                id: 's1',
                clinicId: 'c1',
                clientId: 'w1',
                clientName: 'Peşin müşteri',
                isWalkIn: true,
                status: over.voided ? 'Voided' : 'Active',
                soldAtUtc: '2026-10-14T08:00:00Z',
                totalAmount: 91,
                paidAmount: 91,
                outstandingAmount: 0,
                lines: [{ id: 'sl1', productId: 'p1', productName: 'Mama', quantity: 2, unitPrice: 45.5, lineAmount: 91 }]
            }
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
    });

describe('SalesListPageComponent', () => {
    let fixture: ComponentFixture<SalesListPageComponent>;
    let getSales: jasmine.Spy;
    let claims: Set<string>;

    const el = () => fixture.nativeElement as HTMLElement;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [SalesListPageComponent],
            providers: [
                provideRouter([]),
                { provide: SalesService, useValue: { getSales } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SalesListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['Sales.Read', 'Sales.Create']);
        getSales = jasmine.createSpy('getSales').and.returnValue(of(paged()));
    });

    it('satırı müşteri, ürün özeti ve toplamla listeler; iptaller varsayılan olarak istenmez', async () => {
        await setup();
        const row = el().querySelector('tbody tr')!.textContent!;
        expect(row).toContain('Peşin müşteri');
        expect(row).toContain('Mama');
        expect(row).toContain('Geçerli');
        expect(getSales.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ includeVoided: false, page: 1 }));
    });

    it('"İptal edilenleri göster" işaretlenince includeVoided ile yeniden yükler', async () => {
        await setup();
        fixture.componentInstance.includeVoided = true;
        fixture.componentInstance.applyFilters();
        expect(getSales.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ includeVoided: true, page: 1 }));
    });

    it('Hızlı satış düğmesi yalnız Sales.Create ile görünür', async () => {
        await setup();
        expect(el().textContent).toContain('Hızlı satış');
        TestBed.resetTestingModule();
        claims = new Set(['Sales.Read']);
        await setup();
        expect(el().textContent).not.toContain('Hızlı satış');
    });

    it('boş sonuçta boş durum, hatada hata durumu gösterilir', async () => {
        getSales.and.returnValue(of({ ...paged(), items: [], totalItems: 0 }));
        await setup();
        expect(el().textContent).toContain('Satış bulunamadı.');
        TestBed.resetTestingModule();
        getSales = jasmine.createSpy().and.returnValue(throwError(() => new Error('Satış listesi yüklenemedi.')));
        await setup();
        expect(el().textContent).toContain('Satış listesi yüklenemedi.');
    });
});
