/**
 * Yeni aşı kaydı — UI / servis isteği.
 * `appliedAtUtc` / `nextDueAtUtc` ISO UTC (formda `date.utils` ile üretilir).
 * `clientId` yalnızca formda müşteri seçimini tutar; API gövdesine mapper karar verir (varsayılan: gönderilmez).
 */

export interface CreateVaccinationRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineDefinitionId: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
    /** Aşı ürünü; verilirse uygulama + stok düşümü aynı işlemde yazılır (durum `Uygulandı` olmalı). */
    productId?: string | null;
    /** Ürünün stok biriminde; boşsa sunucu 1 kabul eder. */
    quantity?: number | null;
    /** Boşsa sunucu FEFO ile seçer. */
    batchId?: string | null;
    /** Form başına bir kez üretilen anahtar; aynı anahtarla tekrar istek ikinci düşüm üretmez. */
    requestId?: string | null;
}

export interface UpdateVaccinationRequest {
    id?: string;
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineDefinitionId: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}
