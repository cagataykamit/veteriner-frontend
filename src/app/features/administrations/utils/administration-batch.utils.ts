import type { ProductStockBatchesVm, StockBatchVm } from '@/app/features/inventory/models/stock-batch-vm.model';

/**
 * Uygulama partisi "otomatik" bırakıldığında sunucunun FEFO seçimini önceden gösterir (`BATCH_STOCK_API_CONTRACT.md` §1, §6):
 * SKT'si en yakın, süresi geçmemiş, **tek başına yeterli** parti; yoksa yeterli partisiz bakiye. Karar sunucudadır, bu yalnız öneridir.
 * `batches` backend'den FEFO sıralı gelir.
 */
export type AdministrationBatchSuggestion =
    | { kind: 'batch'; batch: StockBatchVm }
    | { kind: 'unbatched' }
    /** Yeterli stok yalnız süresi geçmiş partilerde: uygulama reddedilir. */
    | { kind: 'expiredOnly' }
    | { kind: 'insufficient' };

export function suggestAdministrationBatch(info: ProductStockBatchesVm, quantity: number | null): AdministrationBatchSuggestion | null {
    const usable = info.batches.filter((b) => !b.isExpired);
    if (quantity == null || !(quantity > 0)) {
        return usable.length > 0 ? { kind: 'batch', batch: usable[0] } : null;
    }
    const enough = usable.find((b) => b.remainingQuantity >= quantity);
    if (enough) {
        return { kind: 'batch', batch: enough };
    }
    if (info.unbatchedQuantity >= quantity) {
        return { kind: 'unbatched' };
    }
    return info.batches.some((b) => b.isExpired && b.remainingQuantity >= quantity) ? { kind: 'expiredOnly' } : { kind: 'insufficient' };
}
