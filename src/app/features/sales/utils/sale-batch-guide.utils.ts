import { suggestAdministrationBatch } from '@/app/features/administrations/utils/administration-batch.utils';
import type { ProductStockBatchesVm } from '@/app/features/inventory/models/stock-batch-vm.model';

export interface SaleBatchGuide {
    /** Kullanılabilir / süresi geçmiş miktar özeti. */
    stockText: string;
    /** Parti seçimi veya FEFO önerisi; söylenecek bir şey yoksa boş. */
    hintText: string;
    warn: boolean;
}

/** Otomatik seçeneği ve parti seçenekleri; süresi geçmiş parti seçilemez (`Sales.BatchExpired`). */
export function saleBatchOptions(info: ProductStockBatchesVm): { value: string; label: string; disabled: boolean }[] {
    return [
        { value: '', label: "Otomatik — SKT'si en yakın uygun parti", disabled: false },
        ...info.batches.map((b) => ({
            value: b.id,
            label: `${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${info.unit}${b.isExpired ? ' · süresi geçmiş' : ''}`.trim(),
            disabled: b.isExpired
        }))
    ];
}

/**
 * Satır için stok özeti ve parti rehberi. Partisi seçilmemişse sunucunun FEFO seçimi önceden gösterilir (karar sunucudadır);
 * miktar tek partiye sığmıyorsa kullanıcı iki satır girer (`DIRECT_SALE_API_CONTRACT.md` §3.1).
 */
export function saleBatchGuide(info: ProductStockBatchesVm, batchId: string, quantity: number | null): SaleBatchGuide {
    const unit = info.unit;
    const expired = info.expiredQuantity > 0 ? ` · Süresi geçmiş ${info.expiredText} ${unit}` : '';
    const stockText = `Kullanılabilir ${info.availableText} ${unit}${expired}`.trim();

    if (batchId) {
        const b = info.batches.find((x) => x.id === batchId);
        if (!b) {
            return { stockText, hintText: '', warn: false };
        }
        const text = `Seçilen parti: ${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${unit}.`;
        return quantity != null && quantity > b.remainingQuantity
            ? { stockText, hintText: `${text} Miktar bu partinin kalanından fazla; ayrı bir satır ekleyin.`, warn: true }
            : { stockText, hintText: text, warn: false };
    }

    const s = suggestAdministrationBatch(info, quantity);
    switch (s?.kind) {
        case 'batch':
            return { stockText, hintText: `Önerilen parti: ${s.batch.lotNumber} · SKT ${s.batch.expiryText} · kalan ${s.batch.remainingText} ${unit}.`, warn: false };
        case 'unbatched':
            return { stockText, hintText: 'Yeterli parti yok; partisiz (devir) bakiyeden düşülecek, fişte seri no ve SKT olmayacak.', warn: false };
        case 'expiredOnly':
            return { stockText, hintText: 'Yeterli stok yalnız süresi geçmiş partide; süresi geçmiş partiden satış yapılamaz.', warn: true };
        case 'insufficient':
            return { stockText, hintText: 'Hiçbir parti bu miktarı tek başına karşılamıyor; miktarı azaltın ya da ayrı satırlar ekleyin.', warn: true };
        default:
            return { stockText, hintText: '', warn: false };
    }
}
