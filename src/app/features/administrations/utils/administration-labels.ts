import type { AdministrationStockOutcome } from '@/app/features/administrations/models/administration-vm.model';

/** Satır, muayene özeti ve timeline'da aynı rozet metni (ADR-013). */
export const ADMINISTRATION_LATE_ENTRY_LABEL = 'Kesinleştirmeden sonra eklendi';

const STOCK_OUTCOME_LABELS: Record<AdministrationStockOutcome, string> = {
    StockReturned: 'Stoğa iade edildi',
    WrittenOff: 'Zarar / imha olarak yazıldı'
};

export function administrationStockOutcomeLabel(outcome: AdministrationStockOutcome): string {
    return STOCK_OUTCOME_LABELS[outcome];
}
