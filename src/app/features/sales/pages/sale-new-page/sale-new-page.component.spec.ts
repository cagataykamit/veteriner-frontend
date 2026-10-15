import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { mapProductStockBatchesDtoToVm } from '@/app/features/inventory/data/stock-batch.mapper';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { mapCreateSaleResponseToVm } from '@/app/features/sales/data/sale.mapper';
import type { CreateSaleRequest } from '@/app/features/sales/models/sale-api.model';
import type { SaleProductVm } from '@/app/features/sales/models/sale-vm.model';
import { SaleProductSearchService } from '@/app/features/sales/services/sale-product-search.service';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { SaleNewPageComponent } from './sale-new-page.component';

const mama: SaleProductVm = {
    id: 'p1',
    name: 'Mama 1 kg',
    sku: 'MAMA-1',
    barcode: '8690001',
    unit: 'adet',
    unitPrice: 45.5,
    currency: 'TRY',
    kind: 'Other',
    controlledClass: 'None'
};
const sampuan: SaleProductVm = { ...mama, id: 'p2', name: 'Şampuan', sku: 'SMP-1', barcode: '8690002', unitPrice: 20 };

const saleResponse = (created = true) =>
    mapCreateSaleResponseToVm({
        created,
        sale: {
            id: 's1',
            clinicId: 'c1',
            clientId: 'w1',
            clientName: 'Peşin müşteri',
            isWalkIn: true,
            status: 'Active',
            soldAtUtc: '2026-10-14T08:00:00Z',
            totalAmount: 45.5,
            paidAmount: 45.5,
            outstandingAmount: 0,
            lines: [{ id: 'sl1', productId: 'p1', productName: 'Mama 1 kg', unit: 'adet', quantity: 1, unitPrice: 45.5, lineAmount: 45.5 }]
        },
        stocks: [{ productId: 'p1', quantityOnHand: 2, isBelowMinimum: true }]
    });

describe('SaleNewPageComponent', () => {
    let fixture: ComponentFixture<SaleNewPageComponent>;
    let cmp: SaleNewPageComponent;
    let search: jasmine.Spy;
    let createSale: jasmine.Spy;
    let mutationBlocked: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const searchInput = () => el().querySelector<HTMLInputElement>('#sale-search')!;
    const submitButton = () => el().querySelector<HTMLButtonElement>('[data-testid="sale-submit"] button')!;

    const typeAndEnter = async (text: string) => {
        const input = searchInput();

        input.value = text;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(async () => {
        mutationBlocked = false;
        search = jasmine.createSpy('search').and.callFake((term: string) => of([mama, sampuan].filter((p) => p.barcode === term || p.name.toLowerCase().includes(term.toLowerCase()))));
        createSale = jasmine.createSpy('createSale').and.callFake(() => of(saleResponse()));
        const batches = mapProductStockBatchesDtoToVm({
            productId: 'p1',
            clinicId: 'c1',
            unit: 'adet',
            quantityOnHand: 15,
            availableQuantity: 10,
            expiredQuantity: 5,
            batchedQuantity: 15,
            unbatchedQuantity: 0,
            batches: [
                { id: 'old', clinicId: 'c1', productId: 'p1', lotNumber: 'L-OLD', expiryDate: '2020-01-01', initialQuantity: 5, remainingQuantity: 5, isExpired: true },
                { id: 'ok', clinicId: 'c1', productId: 'p1', lotNumber: 'L-OK', expiryDate: '2099-01-01', initialQuantity: 10, remainingQuantity: 10 }
            ]
        });

        await TestBed.configureTestingModule({
            imports: [SaleNewPageComponent],
            providers: [
                provideRouter([]),
                { provide: SaleProductSearchService, useValue: { search } },
                { provide: SalesService, useValue: { createSale } },
                { provide: StockBatchService, useValue: { getByProduct: () => of(batches) } },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'cl1', fullName: 'Ali Veli', phone: '—', petNames: [], label: 'Ali Veli' }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => c === 'Sales.Read', getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SaleNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('sayfa açılınca arama kutusuna odaklanır; sepet boşken gönderim kapalıdır', async () => {
        await fixture.whenStable();
        expect(document.activeElement).toBe(searchInput());
        expect(el().querySelector('[data-testid="sale-cart"]')!.textContent).toContain('Sepet boş');
        expect(submitButton().disabled).toBeTrue();
    });

    it('Enter ile barkod eşleşmesi doğrudan sepete eklenir ve arama kutusu temizlenir', async () => {
        await typeAndEnter('8690001');
        expect(el().querySelectorAll('[data-testid="sale-line"]')).toHaveSize(1);
        expect(el().querySelector('[data-testid="sale-line"]')!.textContent).toContain('Mama 1 kg');
        expect(searchInput().value).toBe('');
        expect(el().querySelector('[data-testid="sale-totals"]')!.textContent).toContain('45,50');
    });

    it('aynı ürün tekrar okutulunca yeni satır açılmaz, miktar artar', async () => {
        await typeAndEnter('8690001');
        await typeAndEnter('8690001');
        expect(el().querySelectorAll('[data-testid="sale-line"]')).toHaveSize(1);
        expect(cmp['lines']()[0].quantity).toBe(2);
        expect(el().querySelector('[data-testid="sale-totals"]')!.textContent).toContain('91,00');
    });

    it('belirsiz aramada Enter listeyi gösterir, satıra tıklayınca ekler', async () => {
        search.and.returnValue(of([mama, sampuan]));
        await typeAndEnter('a');
        expect(cmp['lines']()).toHaveSize(0);
        const options = el().querySelectorAll<HTMLButtonElement>('[data-testid="sale-results"] button');

        expect(options).toHaveSize(2);
        options[1].click();
        fixture.detectChanges();
        expect(cmp['lines']().map((l) => l.product.id)).toEqual(['p2']);
    });

    it('birim fiyat satırda düzenlenir ve toplama yansır', async () => {
        await typeAndEnter('8690001');
        const price = el().querySelector<HTMLInputElement>('[id^="p-"]')!;

        price.value = '50';
        price.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(cmp['lines']()[0].unitPrice).toBe(50);
        expect(el().querySelector('[data-testid="sale-totals"]')!.textContent).toContain('50,00');
    });

    it('parti seçeneklerinde süresi geçmiş parti seçilemez ve kullanılabilir/süresi geçmiş miktar gösterilir', async () => {
        await typeAndEnter('8690001');
        const batch = cmp['lineViews']()[0].batch!;

        expect(batch.options!.find((o) => o.value === 'old')!.disabled).toBeTrue();
        expect(el().querySelector('[data-testid="sale-batch"]')!.textContent).toContain('Kullanılabilir 10 adet · Süresi geçmiş 5 adet');
    });

    it('peşin müşteri: ödeme modu seçimi yok, istek clientId olmadan tam ödemeyle gider; başarıda fiş gösterilir', async () => {
        await typeAndEnter('8690001');
        expect(el().querySelector('[data-testid="sale-mode"]')).toBeNull();
        expect(el().querySelector('[data-testid="sale-walk-in"]')).not.toBeNull();
        expect(submitButton().disabled).toBeFalse();

        cmp['submit']();
        fixture.detectChanges();

        const req = createSale.calls.mostRecent().args[0] as CreateSaleRequest;

        expect(req.clientId).toBeUndefined();
        expect(req.clinicId).toBe('c1');
        expect(req.lines).toEqual([{ productId: 'p1', quantity: 1, unitPrice: 45.5, batchId: undefined }]);
        expect(req.payment).toEqual({ method: 'Cash', amount: 45.5 });
        expect(req.requestId).toBeTruthy();
        expect(el().querySelector('[data-testid="sale-done"]')).not.toBeNull();
        expect(el().querySelector('.sale-receipt')!.textContent).toContain('resmî belge, fatura veya e-belge değildir');
        expect(el().querySelector('[data-testid="sale-low-stock"]')!.textContent).toContain('Mama 1 kg');
    });

    it('müşterili satışta veresiye: ödeme gönderilmez', async () => {
        await typeAndEnter('8690001');
        cmp['onClientChange']('cl1');
        cmp['mode'].set('credit');
        fixture.detectChanges();
        expect(el().querySelector('[data-testid="sale-mode"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="sale-totals"]')!.textContent).toContain('Veresiye');

        cmp['submit']();

        const req = createSale.calls.mostRecent().args[0] as CreateSaleRequest;

        expect(req.clientId).toBe('cl1');
        expect(req.payment).toBeUndefined();
    });

    it('kısmi ödeme tutarı toplamdan azsa gider, değilse gönderim kapalıdır', async () => {
        await typeAndEnter('8690001');
        cmp['onClientChange']('cl1');
        cmp['mode'].set('partial');
        cmp['partialAmount'].set(100);
        fixture.detectChanges();
        expect(submitButton().disabled).toBeTrue();
        expect(el().textContent).toContain('toplamdan az olmalı');

        cmp['partialAmount'].set(20);
        fixture.detectChanges();
        expect(submitButton().disabled).toBeFalse();
        cmp['submit']();
        expect((createSale.calls.mostRecent().args[0] as CreateSaleRequest).payment).toEqual({ method: 'Cash', amount: 20 });
    });

    it('müşteri temizlenince ödeme modu tam ödemeye döner', async () => {
        cmp['onClientChange']('cl1');
        cmp['mode'].set('credit');
        cmp['onClientChange']('');
        expect(cmp['mode']()).toBe('full');
    });

    it('hata sonrası mesaj gösterilir; yeniden gönderim aynı requestId ile yapılır, başarıdan sonra yenilenir', async () => {
        createSale.and.returnValues(throwError(() => new Error('Sunucuya ulaşılamıyor. Bağlantıyı kontrol edin.')), of(saleResponse(false)), of(saleResponse()));
        await typeAndEnter('8690001');

        cmp['submit']();
        fixture.detectChanges();
        expect(el().querySelector('[data-testid="sale-error"]')!.textContent).toContain('Sunucuya ulaşılamıyor');
        expect(el().textContent).toContain('satış iki kez kaydedilmez');
        const firstId = (createSale.calls.mostRecent().args[0] as CreateSaleRequest).requestId;

        cmp['submit']();
        fixture.detectChanges();
        expect((createSale.calls.mostRecent().args[0] as CreateSaleRequest).requestId).toBe(firstId);
        expect(el().querySelector('[data-testid="sale-done"]')!.textContent).toContain('daha önce kaydedilmişti');

        el().querySelector<HTMLButtonElement>('[data-testid="sale-new"] button')!.click();
        fixture.detectChanges();
        await typeAndEnter('8690001');
        cmp['submit']();
        expect((createSale.calls.mostRecent().args[0] as CreateSaleRequest).requestId).not.toBe(firstId);
    });

    it('abonelik salt okunursa gönderim kapalıdır', async () => {
        mutationBlocked = true;
        await typeAndEnter('8690001');
        expect(submitButton().disabled).toBeTrue();
        cmp['submit']();
        expect(createSale).not.toHaveBeenCalled();
    });

    it('arama hatası kutunun altında gösterilir', async () => {
        search.and.returnValue(throwError(() => new Error('Ürünler aranamadı.')));
        await typeAndEnter('xyz');
        expect(el().textContent).toContain('Ürünler aranamadı.');
    });
});
