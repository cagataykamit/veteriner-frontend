import { mapProductStockBatchesDtoToVm } from '@/app/features/inventory/data/stock-batch.mapper';
import type { ProductStockBatchesDto } from '@/app/features/inventory/models/stock-batch-api.model';
import { saleBatchGuide, saleBatchOptions } from './sale-batch-guide.utils';

const dto = (over: Partial<ProductStockBatchesDto> = {}): ProductStockBatchesDto => ({
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
        { id: 'ok', clinicId: 'c1', productId: 'p1', lotNumber: 'L-OK', expiryDate: '2099-01-01', initialQuantity: 10, remainingQuantity: 10, isExpired: false }
    ],
    ...over
});

describe('sale-batch-guide.utils', () => {
    const info = () => mapProductStockBatchesDtoToVm(dto());

    it('seçenekler: Otomatik ilk, süresi geçmiş parti seçilemez', () => {
        const options = saleBatchOptions(info());

        expect(options[0]).toEqual(jasmine.objectContaining({ value: '', disabled: false }));
        expect(options.find((o) => o.value === 'old')).toEqual(jasmine.objectContaining({ disabled: true }));
        expect(options.find((o) => o.value === 'old')!.label).toContain('süresi geçmiş');
        expect(options.find((o) => o.value === 'ok')!.disabled).toBeFalse();
    });

    it('stok özeti kullanılabilir ve süresi geçmiş miktarı gösterir', () => {
        const guide = saleBatchGuide(info(), '', 1);

        expect(guide.stockText).toBe('Kullanılabilir 10 adet · Süresi geçmiş 5 adet');
    });

    it('süresi geçmiş miktar yoksa özet yalnız kullanılabilir miktardır', () => {
        const noExpired = mapProductStockBatchesDtoToVm(dto({ expiredQuantity: 0, batches: [dto().batches![1]] }));

        expect(saleBatchGuide(noExpired, '', 1).stockText).toBe('Kullanılabilir 10 adet');
    });

    it('otomatikte FEFO önerisi: süresi geçmemiş yeterli ilk parti', () => {
        const guide = saleBatchGuide(info(), '', 3);

        expect(guide.hintText).toContain('Önerilen parti: L-OK');
        expect(guide.warn).toBeFalse();
    });

    it('hiçbir parti yetmiyorsa uyarır', () => {
        const guide = saleBatchGuide(info(), '', 50);

        expect(guide.warn).toBeTrue();
        expect(guide.hintText).toContain('tek başına karşılamıyor');
    });

    it('yeterli stok yalnız süresi geçmiş partideyse satış yapılamayacağını söyler', () => {
        const onlyExpired = mapProductStockBatchesDtoToVm(dto({ batches: [dto().batches![0]], availableQuantity: 0 }));
        const guide = saleBatchGuide(onlyExpired, '', 4);

        expect(guide.warn).toBeTrue();
        expect(guide.hintText).toContain('süresi geçmiş');
    });

    it('seçili parti: kalan yetiyorsa bilgi, yetmiyorsa uyarı', () => {
        expect(saleBatchGuide(info(), 'ok', 4)).toEqual(jasmine.objectContaining({ warn: false }));
        const over = saleBatchGuide(info(), 'ok', 11);

        expect(over.warn).toBeTrue();
        expect(over.hintText).toContain('ayrı bir satır');
    });

    it('partisiz bakiye yeterliyse devir bakiyesinden düşüleceğini söyler', () => {
        const unbatched = mapProductStockBatchesDtoToVm(dto({ batches: [], unbatchedQuantity: 8, batchedQuantity: 0, quantityOnHand: 8, availableQuantity: 8, expiredQuantity: 0 }));

        expect(saleBatchGuide(unbatched, '', 3).hintText).toContain('partisiz (devir)');
    });
});
