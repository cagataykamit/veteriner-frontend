import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapSaleDtoToDetailVm } from '@/app/features/sales/data/sale.mapper';
import type { SaleDto } from '@/app/features/sales/models/sale-api.model';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { SaleDetailPageComponent } from './sale-detail-page.component';

const dto = (over: Partial<SaleDto> = {}): SaleDto => ({
    id: 's1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    isWalkIn: false,
    status: 'Active',
    soldAtUtc: '2026-10-14T08:00:00Z',
    totalAmount: 91,
    paidAmount: 40,
    outstandingAmount: 51,
    lines: [{ id: 'sl1', productId: 'p1', productName: 'Mama', unit: 'kg', quantity: 2, unitPrice: 45.5, lineAmount: 91 }],
    ...over
});

describe('SaleDetailPageComponent', () => {
    let fixture: ComponentFixture<SaleDetailPageComponent>;
    let getSaleById: jasmine.Spy;
    let voidSale: jasmine.Spy;
    let claims: Set<string>;

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';
    const buttonLabels = () => Array.from(el().querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

    const setup = async (sale: SaleDto = dto()) => {
        getSaleById = jasmine.createSpy('getSaleById').and.returnValue(of(mapSaleDtoToDetailVm(sale)));
        voidSale = jasmine.createSpy('voidSale').and.callFake((_id: string, r: { stockOutcome: 'StockReturned' | 'WrittenOff'; reason: string }) =>
            of(mapSaleDtoToDetailVm(dto({ status: 'Voided', paidAmount: 0, outstandingAmount: 0, voidReason: r.reason, voidStockOutcome: r.stockOutcome })))
        );
        await TestBed.configureTestingModule({
            imports: [SaleDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: SalesService, useValue: { getSaleById, voidSale } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 's1' } } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SaleDetailPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['Sales.Read', 'Sales.Correct']);
    });

    it('özet, kalan borç ve bilgi amaçlı fişi gösterir', async () => {
        await setup();
        expect(getSaleById).toHaveBeenCalledWith('s1');
        expect(text()).toContain('Ali Veli');
        expect(text()).toContain('Kalan borç');
        expect(el().querySelector('.sale-receipt')!.textContent).toContain('resmî belge, fatura veya e-belge değildir');
        expect(buttonLabels().some((l) => l.includes('Fişi yazdır'))).toBeTrue();
    });

    it('iptal düğmesi yalnız Sales.Correct ile görünür', async () => {
        await setup();
        expect(buttonLabels().some((l) => l.includes('İptal et'))).toBeTrue();
        TestBed.resetTestingModule();
        claims = new Set(['Sales.Read']);
        await setup();
        expect(buttonLabels().some((l) => l.includes('İptal et'))).toBeFalse();
    });

    it('iptal edilmiş satışta iptal düğmesi yoktur, iptal bilgisi gösterilir', async () => {
        await setup(dto({ status: 'Voided', voidReason: 'Yanlış ürün', voidStockOutcome: 'WrittenOff', paidAmount: 0, outstandingAmount: 0 }));
        expect(buttonLabels().some((l) => l.includes('İptal et'))).toBeFalse();
        const info = el().querySelector('[data-testid="sale-void-info"]')!.textContent!;
        expect(info).toContain('Yanlış ürün');
        expect(info).toContain('Zarar yazıldı');
        expect(text()).toContain('İptal edildi');
    });

    it('iptal diyaloğu stoğa dön / zarar yaz seçimi sunar ve seçimle iptal eder', async () => {
        await setup();
        const component = fixture.componentInstance;
        component.voidVisible.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        const body = document.body.textContent ?? '';
        expect(body).toContain('Stoğa dön');
        expect(body).toContain('Zarar yaz');
        expect(body).toContain('Kısmi iade yoktur');

        const dialog = fixture.debugElement.query((d) => d.name === 'app-sale-void-dialog').componentInstance as { execute: (r: string) => import('rxjs').Observable<unknown>; stockOutcome: { set: (v: string) => void } };
        dialog.stockOutcome.set('WrittenOff');
        dialog.execute('Yanlış ürün satıldı').subscribe();
        expect(voidSale).toHaveBeenCalledWith('s1', { reason: 'Yanlış ürün satıldı', stockOutcome: 'WrittenOff' });
    });

    it('yükleme hatasında hata durumu gösterilir', async () => {
        getSaleById = jasmine.createSpy().and.returnValue(throwError(() => new Error('Satış bulunamadı.')));
        await TestBed.configureTestingModule({
            imports: [SaleDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: SalesService, useValue: { getSaleById } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'x' } } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SaleDetailPageComponent);
        fixture.detectChanges();
        expect(text()).toContain('Satış bulunamadı.');
    });
});
