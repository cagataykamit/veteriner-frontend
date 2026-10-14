import type { SaleDto } from '@/app/features/sales/models/sale-api.model';
import {
    isSellableProduct,
    mapCreateSaleResponseToVm,
    mapPagedSalesToVm,
    mapProductDtoToSaleProductVm,
    mapSaleDtoToDetailVm,
    salesQueryToHttpParams
} from './sale.mapper';

const sale = (over: Partial<SaleDto> = {}): SaleDto => ({
    id: 's1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Peşin müşteri',
    isWalkIn: true,
    status: 'Active',
    soldAtUtc: '2026-10-14T08:00:00Z',
    totalAmount: 91,
    currency: 'TRY',
    paidAmount: 91,
    outstandingAmount: 0,
    lines: [
        { id: 'sl1', productId: 'p1', productName: 'Mama', unit: 'kg', quantity: 2, unitPrice: 45.5, lineAmount: 91, lotNumber: 'L-1', expiryDate: '2027-01-31' }
    ],
    ...over
});

describe('sale.mapper', () => {
    it('detay: peşin müşteri adı, para metinleri, satır ve parti metni', () => {
        const vm = mapSaleDtoToDetailVm(sale());
        expect(vm.clientName).toBe('Peşin müşteri');
        expect(vm.isWalkIn).toBeTrue();
        expect(vm.isVoided).toBeFalse();
        expect(vm.statusLabel).toBe('Geçerli');
        expect(vm.hasOutstanding).toBeFalse();
        expect(vm.totalAmount).toBe(91);
        expect(vm.lines[0].productName).toBe('Mama');
        expect(vm.lines[0].batchText).toContain('L-1');
        expect(vm.lines[0].batchText).toContain('SKT');
        expect(vm.productsSummary).toBe('Mama');
    });

    it('veresiyeli satış kalan borç gösterir; iptal edilmiş satışta kalan borç yok sayılır', () => {
        const open = mapSaleDtoToDetailVm(sale({ isWalkIn: false, clientName: 'Ali Veli', paidAmount: 40, outstandingAmount: 51 }));
        expect(open.hasOutstanding).toBeTrue();
        expect(open.clientName).toBe('Ali Veli');
        const voided = mapSaleDtoToDetailVm(sale({ status: 'Voided', paidAmount: 0, outstandingAmount: 51, voidReason: 'Yanlış ürün', voidStockOutcome: 'WrittenOff' }));
        expect(voided.isVoided).toBeTrue();
        expect(voided.hasOutstanding).toBeFalse();
        expect(voided.statusLabel).toBe('İptal edildi');
        expect(voided.voidStockOutcomeLabel).toBe('Zarar yazıldı');
    });

    it('ürün özeti üçüncü satırdan sonrasını sayıyla toplar', () => {
        const lines = ['A', 'B', 'C', 'D'].map((n, i) => ({ id: `l${i}`, productId: `p${i}`, productName: n, quantity: 1, unitPrice: 1, lineAmount: 1 }));
        expect(mapSaleDtoToDetailVm(sale({ lines })).productsSummary).toBe('A, B +2');
    });

    it('sayfalı liste ve oluşturma yanıtı eşlenir; aynı requestId yanıtı created:false taşır', () => {
        const paged = mapPagedSalesToVm({ items: [sale()], page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
        expect(paged.items).toHaveSize(1);
        expect(paged.totalPages).toBe(2);
        const created = mapCreateSaleResponseToVm({
            created: false,
            sale: sale(),
            stocks: [{ productId: 'p1', quantityOnHand: 3, isBelowMinimum: true }]
        });
        expect(created.created).toBeFalse();
        expect(created.stocks).toEqual([{ productId: 'p1', quantityText: '3', isBelowMinimum: true }]);
    });

    it('sorgu parametreleri: boşlar atılır, iptaller yalnız istenince', () => {
        const base = salesQueryToHttpParams({ page: 2, pageSize: 50, clientId: ' ', fromUtc: '2026-10-01T00:00:00Z' });
        expect(base.get('page')).toBe('2');
        expect(base.get('pageSize')).toBe('50');
        expect(base.has('clientId')).toBeFalse();
        expect(base.get('fromUtc')).toBe('2026-10-01T00:00:00Z');
        expect(base.has('includeVoided')).toBeFalse();
        expect(salesQueryToHttpParams({ includeVoided: true }).get('includeVoided')).toBe('true');
    });

    it('ürün: sayısal fiyat, barkod; aşı ve kontrollü ürün satılamaz', () => {
        const normal = mapProductDtoToSaleProductVm({ id: 'p1', name: 'Mama', barcode: ' 869 ', unitPrice: '45.50', kind: 'Other', controlledClass: 'None', unit: 'kg' });
        expect(normal.unitPrice).toBe(45.5);
        expect(normal.barcode).toBe('869');
        expect(isSellableProduct(normal)).toBeTrue();
        expect(isSellableProduct({ kind: 'Medicine', controlledClass: 'None' })).toBeTrue();
        expect(isSellableProduct({ kind: 'Vaccine', controlledClass: 'None' })).toBeFalse();
        expect(isSellableProduct({ kind: 'Medicine', controlledClass: 'Narcotic' })).toBeFalse();
        expect(isSellableProduct({ kind: 'Other', controlledClass: 'Psychotropic' })).toBeFalse();
    });
});
