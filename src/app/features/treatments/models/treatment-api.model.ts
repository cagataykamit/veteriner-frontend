/**
 * Backend Veteriner API — tedavi (treatment) DTO’ları.
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
}
