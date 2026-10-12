/**
 * Backend Veteriner API — reçete (prescription) DTO’ları.
 *
 * Write/read `title` / `content` / `notes` / `followUpDateUtc` ve yapılandırılmış satırlar (`items`, `docs/PRESCRIPTION_ITEMS_API_CONTRACT.md`).
 * Satırda birim/lot/son kullanma yoktur (D4); reçete stok düşmez.
 */

export interface PrescriptionListItemDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    prescribedAtUtc?: string | null;
    title?: string | null;
    examinationId?: string | null;
    treatmentId?: string | null;
    followUpDateUtc?: string | null;
}

export interface PrescriptionListItemDtoPagedResult {
    items?: PrescriptionListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Detay yanıtındaki satır; eski (serbest metin) reçetelerde `items` boş dizidir. */
export interface PrescriptionItemDto {
    id: string;
    sortOrder: number;
    name: string;
    productId?: string | null;
    instructions?: string | null;
    quantity?: number | null;
}

/** İstek satırı: `id` ve `sortOrder` sunucuda atanır. */
export interface PrescriptionItemWriteDto {
    name: string;
    productId?: string | null;
    instructions?: string | null;
    quantity?: number | null;
}

export interface PrescriptionDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    examinationId?: string | null;
    treatmentId?: string | null;
    prescribedAtUtc?: string | null;
    title?: string | null;
    content?: string | null;
    notes?: string | null;
    followUpDateUtc?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    items?: PrescriptionItemDto[] | null;
}

/** POST / PUT body — alan adları API ile uyumlu. */
export interface PrescriptionWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    prescribedAtUtc: string;
    title: string;
    content: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
    /** Alan yok/`null`: mevcut satırlara dokunulmaz (PUT); `[]`: tüm satırlar silinir; dolu: tümü değiştirilir. */
    items?: PrescriptionItemWriteDto[] | null;
}
