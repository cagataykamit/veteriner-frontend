/**
 * Backend Veteriner API — muayene DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface ExaminationListItemDto {
    id: string;
    tenantId?: string;
    examinationDateUtc?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    status?: string | null;
    complaint?: string | null;
    createdAtUtc?: string | null;
}

export interface ExaminationListItemDtoPagedResult {
    items?: ExaminationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ExaminationDetailDto {
    id: string;
    tenantId?: string;
    examinationDateUtc?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    status?: string | null;
    complaint?: string | null;
    notes?: string | null;
    findings?: string | null;
    diagnosis?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/** POST body — alan adları API ile uyumlu. */
export interface ExaminationCreateRequestDto {
    clientId: string;
    petId: string;
    examinationDateUtc: string;
    complaint?: string | null;
    notes?: string | null;
    findings?: string | null;
    diagnosis?: string | null;
}
