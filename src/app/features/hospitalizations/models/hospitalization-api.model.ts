/**
 * Backend — Hospitalizations DTO’ları.
 */

export interface HospitalizationListItemDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    examinationId?: string | null;
    admittedAtUtc?: string | null;
    plannedDischargeAtUtc?: string | null;
    dischargedAtUtc?: string | null;
    reason?: string | null;
    isActive?: boolean | null;
}

export interface HospitalizationListItemDtoPagedResult {
    items?: HospitalizationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface HospitalizationDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    examinationId?: string | null;
    admittedAtUtc?: string | null;
    plannedDischargeAtUtc?: string | null;
    dischargedAtUtc?: string | null;
    reason?: string | null;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    isActive?: boolean | null;
}

/** POST create / PUT update body — API ile uyumlu. */
export interface HospitalizationWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
}

export interface DischargeHospitalizationRequestDto {
    dischargedAtUtc: string;
    notes?: string | null;
}
