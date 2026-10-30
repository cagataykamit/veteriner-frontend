/**
 * Reçete oluşturma / güncelleme — UI / servis isteği.
 */

/** Reçete satırı (istek): `name` yoksa `productId` zorunlu; ürün adı sunucuda kopyalanır. */
export interface PrescriptionItemInput {
    /** Mevcut satırın kimliği (düzenlemede); yeni satırda yok. */
    id?: string | null;
    name: string;
    productId?: string | null;
    instructions?: string | null;
    quantity?: number | null;
    dose?: string | null;
    unit?: string | null;
    lotNumber?: string | null;
}

export interface CreatePrescriptionRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    prescribedAtUtc: string;
    title: string;
    content: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
    /** `undefined`: satırlara dokunma (PUT); dizi (boş dâhil): sunucudaki satırları bu liste ile değiştir. */
    items?: PrescriptionItemInput[];
    /** Bağlı muayene kesinleşmişse zorunlu gerekçe (sonradan ekleme, RECORD-008); yalnız oluşturmada. */
    lateEntryReason?: string | null;
}
