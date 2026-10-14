import type { AdministrationCreateResultVm, AdministrationStockOutcome, AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

/** Satır, muayene özeti ve timeline'da aynı rozet metni (ADR-013). */
export const ADMINISTRATION_LATE_ENTRY_LABEL = 'Kesinleştirmeden sonra eklendi';

const STOCK_OUTCOME_LABELS: Record<AdministrationStockOutcome, string> = {
    StockReturned: 'Stoğa iade edildi',
    WrittenOff: 'Zarar / imha olarak yazıldı'
};

/** Satırda düşülen parti: "Seri: X · SKT: gg.aa.yyyy"; partisiz bakiyeden düşülmüşse `null`. */
export function administrationBatchText(row: Pick<AdministrationVm, 'lotNumber' | 'expiryDate'>): string | null {
    const parts: string[] = [];
    if (row.lotNumber) {
        parts.push(`Seri: ${row.lotNumber}`);
    }
    if (row.expiryDate) {
        parts.push(`SKT: ${formatDateDisplay(row.expiryDate)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
}

/** Uygulama/aşı kaydından sonra kalan stok bildirimi; `subject` kaydın adı ("Uygulama" | "Aşı"). */
export function administrationSavedNotice(result: AdministrationCreateResultVm, subject: string): { text: string; warn: boolean } {
    const { administration, stock } = result;
    if (!result.created) {
        return { text: `Bu ${subject.toLocaleLowerCase('tr-TR')} zaten kaydedilmişti; stok tekrar düşülmedi.`, warn: false };
    }
    if (stock.isBelowMinimum) {
        return {
            text: `${subject} kaydedildi. Dikkat: ${administration.productName} stoğu minimum düzeyin altına indi (kalan kullanılabilir ${stock.availableQuantity} ${administration.unit}, minimum ${stock.minimumStockLevel}).`,
            warn: true
        };
    }
    return { text: `${subject} kaydedildi; kalan kullanılabilir stok ${stock.availableQuantity} ${administration.unit}.`, warn: false };
}

export function administrationStockOutcomeLabel(outcome: AdministrationStockOutcome): string {
    return STOCK_OUTCOME_LABELS[outcome];
}
