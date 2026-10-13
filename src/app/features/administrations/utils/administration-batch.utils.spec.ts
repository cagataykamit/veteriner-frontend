import { suggestAdministrationBatch } from '@/app/features/administrations/utils/administration-batch.utils';
import type { ProductStockBatchesVm, StockBatchVm } from '@/app/features/inventory/models/stock-batch-vm.model';

const batch = (id: string, remaining: number, isExpired = false): StockBatchVm => ({
    id,
    lotNumber: id,
    expiryDate: '2027-01-01',
    expiryText: '01.01.2027',
    expiryStatus: isExpired ? 'expired' : 'ok',
    expiryBadgeLabel: '',
    expiryBadgeSeverity: 'secondary',
    isExpired,
    initialQuantity: remaining,
    remainingQuantity: remaining,
    remainingText: String(remaining),
    unit: 'şişe',
    supplierName: '—',
    invoiceText: '—',
    receivedText: '—'
});

const info = (batches: StockBatchVm[], unbatched = 0): ProductStockBatchesVm => ({
    productId: 'p',
    clinicId: 'c',
    unit: 'şişe',
    quantityOnHand: 0,
    quantityOnHandText: '0',
    batchedQuantityText: '0',
    unbatchedQuantity: unbatched,
    unbatchedQuantityText: String(unbatched),
    batches
});

describe('suggestAdministrationBatch', () => {
    it('miktar yokken ilk (SKT en yakın) geçerli partiyi önerir', () => {
        const s = suggestAdministrationBatch(info([batch('old', 5, true), batch('a', 1), batch('b', 9)]), null);
        expect(s).toEqual({ kind: 'batch', batch: jasmine.objectContaining({ id: 'a' }) });
    });

    it('ilk yeterli ve süresi geçmemiş partiyi seçer (bölünmüş düşüm yok)', () => {
        const s = suggestAdministrationBatch(info([batch('a', 1), batch('b', 9)]), 4);
        expect(s).toEqual({ kind: 'batch', batch: jasmine.objectContaining({ id: 'b' }) });
    });

    it('yeterli parti yoksa yeterli partisiz bakiyeyi önerir', () => {
        expect(suggestAdministrationBatch(info([batch('a', 1)], 5), 4)).toEqual({ kind: 'unbatched' });
    });

    it('yeterli stok yalnız süresi geçmiş partideyse expiredOnly', () => {
        expect(suggestAdministrationBatch(info([batch('old', 9, true), batch('a', 1)]), 4)).toEqual({ kind: 'expiredOnly' });
    });

    it('hiçbiri yetmezse insufficient; parti hiç yoksa ve miktar yoksa null', () => {
        expect(suggestAdministrationBatch(info([batch('a', 1), batch('b', 2)]), 4)).toEqual({ kind: 'insufficient' });
        expect(suggestAdministrationBatch(info([]), null)).toBeNull();
    });
});
