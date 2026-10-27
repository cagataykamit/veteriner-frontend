/** İptalde stok sonucu: iade (stok artar) veya zarar/imha (stok artmaz). */
export type AdministrationStockOutcome = 'StockReturned' | 'WrittenOff';

export interface AdministrationVm {
    id: string;
    petId: string;
    examinationId: string | null;
    treatmentId: string | null;
    productId: string;
    productName: string;
    productSku: string | null;
    unit: string;
    quantity: number;
    administeredAtUtc: string;
    notes: string | null;
    isVoided: boolean;
    voidedAtUtc: string | null;
    voidReason: string | null;
    /** Yalnız iptal edilmiş kayıtta; bilinmeyen değer `null`. */
    voidStockOutcome: AdministrationStockOutcome | null;
    /** Bağlı muayene kayıt anında kesinleşmişti; gerekçesi `lateEntryReason`. */
    addedAfterFinalization: boolean;
    lateEntryReason: string | null;
    createdAtUtc: string;
    /** Düşülen parti; `null` = partisiz bakiye. */
    batchId: string | null;
    lotNumber: string | null;
    /** `yyyy-MM-dd`. */
    expiryDate: string | null;
    /** Bağlı aşı kaydı; iptali aşı kaydını da iptal eder. */
    vaccinationId: string | null;
}

export interface AdministrationStockVm {
    quantityOnHand: number;
    availableQuantity: number;
    minimumStockLevel: number;
    isBelowMinimum: boolean;
}

export interface AdministrationsPagedVm {
    items: AdministrationVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /administrations sorgusu; klinik kapsamı servis tarafından eklenir. */
export interface AdministrationsListQuery {
    page?: number;
    pageSize?: number;
    clinicId?: string;
    petId?: string;
    examinationId?: string;
    treatmentId?: string;
    productId?: string;
    includeVoided?: boolean;
}

export interface CreateAdministrationRequest {
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    productId: string;
    quantity: number;
    /** Boşsa sunucu "şimdi" kullanır. */
    administeredAtUtc?: string | null;
    notes?: string | null;
    /** Bağlı muayene kesinleşmişse zorunlu (5–500); taslakta/muayenesizde gönderilmez. */
    lateEntryReason?: string | null;
    /** Form başına bir kez üretilen anahtar; aynı anahtarla tekrar istek ikinci düşüm üretmez. */
    requestId: string;
    /** Boşsa sunucu FEFO ile seçer. */
    batchId?: string | null;
}

export interface AdministrationCreateResultVm {
    /** `false`: aynı `requestId` ile daha önce kaydedilmiş uygulama döndü (stok değişmedi). */
    created: boolean;
    administration: AdministrationVm;
    stock: AdministrationStockVm;
}
