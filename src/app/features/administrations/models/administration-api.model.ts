/**
 * Uygulama (administration) API DTO'ları — `docs/ADMINISTRATIONS_API_CONTRACT.md`.
 * Yalnızca mapper ve servis kullanır.
 */

export interface AdministrationDto {
    id: string;
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    productId: string;
    productName: string;
    productSku?: string | null;
    unit: string;
    quantity: number;
    administeredAtUtc: string;
    notes?: string | null;
    status: string;
    voidedAtUtc?: string | null;
    voidedByUserId?: string | null;
    voidReason?: string | null;
    /** `StockReturned` | `WrittenOff`; yalnız iptalde. */
    voidStockOutcome?: string | null;
    addedAfterFinalization?: boolean | null;
    lateEntryReason?: string | null;
    createdByUserId: string;
    createdAtUtc: string;
    requestId?: string | null;
    /** Düşülen parti; `null` = partisiz bakiye (`BATCH_STOCK_API_CONTRACT.md` §6). */
    batchId?: string | null;
    lotNumber?: string | null;
    expiryDate?: string | null;
}

/** Yalnız oluşturma yanıtında; düşümden sonraki stok. */
export interface AdministrationStockDto {
    quantityOnHand: number;
    /** Süresi geçmemiş miktar; "kalan stok" bildirimi buna göre. */
    availableQuantity?: number;
    minimumStockLevel: number;
    isBelowMinimum: boolean;
}

export interface AdministrationCreateResultDto {
    created: boolean;
    administration: AdministrationDto;
    stock: AdministrationStockDto;
}

export interface AdministrationPagedResultDto {
    items?: AdministrationDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface AdministrationCreateRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    productId: string;
    quantity: number;
    administeredAtUtc?: string | null;
    notes?: string | null;
    lateEntryReason?: string | null;
    requestId?: string | null;
    /** Verilmezse sunucu FEFO ile seçer. */
    batchId?: string | null;
}
