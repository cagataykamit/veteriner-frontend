/** Form/UI kanonik hareket tipi — POST’ta `mapMovementTypeToApiValue` ile sayıya çevrilir. */
export type StockMovementFormMovementType = 'Initial' | 'In' | 'Out' | 'Adjustment';

/** `getStockMovementFormValue` çıktısı → mapper ile Create gövdesine. */
export interface StockMovementUpsertFormValue {
    clinicId: string;
    productId: string;
    movementType: StockMovementFormMovementType;
    quantity: number;
    unitCost: number | null;
    reason: string | null;
    occurredAtUtc: string | null;
    notes: string | null;
}
