/**
 * Backend — Lab Results DTO’ları.
 */

export interface LabResultListItemDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    resultDateUtc?: string | null;
    testName?: string | null;
    examinationId?: string | null;
}

export interface LabResultListItemDtoPagedResult {
    items?: LabResultListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface LabResultDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    examinationId?: string | null;
    resultDateUtc?: string | null;
    testName?: string | null;
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/** POST / PUT body — API ile uyumlu. */
export interface LabResultWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    resultDateUtc: string;
    testName: string;
    resultText: string;
    interpretation?: string | null;
    notes?: string | null;
}
