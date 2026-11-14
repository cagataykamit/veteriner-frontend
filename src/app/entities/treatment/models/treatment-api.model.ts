/**
 * Backend Veteriner API — tedavi (treatment) DTO’ları.
 *
 * Şu an tedavi **türü** / **durum** alanları bu şemada yok; backend desteklemedikçe UI’da eklenmez (Sprint3).
 */

export interface TreatmentListItemDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    treatmentDateUtc?: string | null;
    title?: string | null;
    examinationId?: string | null;
    followUpDateUtc?: string | null;
}

export interface TreatmentListItemDtoPagedResult {
    items?: TreatmentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface TreatmentDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    examinationId?: string | null;
    treatmentDateUtc?: string | null;
    title?: string | null;
    description?: string | null;
    notes?: string | null;
    followUpDateUtc?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    /** Eşzamanlılık sürümü (ADR-043 K5); PUT ve iptale aynen geri gönderilir. */
    rowVersion?: string | null;
    /** Gerekçeli iptal (ADR-043 AK-2). */
    cancelledAtUtc?: string | null;
    cancelReason?: string | null;
    /** Kesinleşmiş muayeneye sonradan eklendi (ADR-043 AK-6). */
    addedAfterFinalization?: boolean | null;
    lateEntryReason?: string | null;
}

/** POST / PUT body — alan adları API ile uyumlu. */
export interface TreatmentWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentDateUtc: string;
    title: string;
    description: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
    /** Yalnız PUT; GET'ten alınan sürüm (zorunlu, `TREATMENTS_API_CONTRACT.md` §1). */
    rowVersion?: string;
    /** Bağlı muayene kesinleşmişse zorunlu (5–500, sonradan ekleme, §4); yalnız POST. */
    lateEntryReason?: string | null;
}
