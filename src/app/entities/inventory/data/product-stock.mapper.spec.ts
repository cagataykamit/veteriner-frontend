import { mapProductStockDtoToVm } from '@/app/entities/inventory/data/product-stock.mapper';
import { mapProductStockBatchesDtoToVm } from '@/app/entities/inventory/data/stock-batch.mapper';

describe('stok: kullanılabilir / süresi geçmiş', () => {
    const base = { id: 's1', quantityOnHand: 8, minimumStockLevel: 5 };

    it('kullanılabilir ve süresi geçmiş ayrı okunur; düşük stok sunucu bayrağıdır', () => {
        const vm = mapProductStockDtoToVm({ ...base, availableQuantity: 3, expiredQuantity: 5, isBelowMinimum: true });

        expect(vm.availableText).toBe('3');
        expect(vm.expiredText).toBe('5');
        expect(vm.hasExpired).toBe(true);
        expect(vm.isBelowMinimum).toBe(true);
        expect(vm.statusLabel).toBe('Düşük stok');
    });

    it('toplam 8 > minimum 5 olsa da sunucu bayrağı false ise istemci yeniden hesaplamaz', () => {
        const vm = mapProductStockDtoToVm({ ...base, availableQuantity: 8, expiredQuantity: 0, isBelowMinimum: false });

        expect(vm.hasExpired).toBe(false);
        expect(vm.statusLabel).toBe('Yeterli');
    });

    it('eski yanıtta alanlar yoksa kullanılabilir toplama eşit, süresi geçmiş 0', () => {
        const vm = mapProductStockDtoToVm(base);

        expect(vm.availableQuantity).toBe(8);
        expect(vm.expiredQuantity).toBe(0);
    });

    it('parti özetinde kullanılabilir ve süresi geçmiş üstte gelir', () => {
        const vm = mapProductStockBatchesDtoToVm({
            productId: 'p',
            clinicId: 'c',
            quantityOnHand: 8,
            availableQuantity: 3,
            expiredQuantity: 5,
            batchedQuantity: 8,
            unbatchedQuantity: 0,
            batches: []
        });

        expect(vm.availableText).toBe('3');
        expect(vm.expiredText).toBe('5');
        expect(vm.expiredQuantity).toBe(5);
    });
});
