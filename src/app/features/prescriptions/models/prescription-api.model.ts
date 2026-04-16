/**
 * Backend Veteriner API — reçete (prescription) DTO’ları.
 *
 * Write/read şu an `title` / `content` / `notes` / `followUpDateUtc` odaklıdır.
 * İlaç adedi, doz, frekans vb. alanlar backend şemasında yoksa UI’da eklenmez (Sprint3).
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
}
