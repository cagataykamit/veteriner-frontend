/**
 * Backend — Lab Results DTO’ları (`docs/LAB_RESULT_STATUS_API_CONTRACT.md`).
 * Tek kayıt, durum alanı: İstem (`Requested`) → Sonuç (`Resulted`); ikisinden de `Cancelled`.
 * `awaitingInterpretation` durum değil, türetilmiş bayraktır (`Resulted` ve yorum boş).
 */

export type LabResultStatusDto = 'Requested' | 'Resulted' | 'Cancelled';

export interface LabResultListItemDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    /** `Requested` kayıtta null. */
    resultDateUtc?: string | null;
    testName?: string | null;
    examinationId?: string | null;
    status?: LabResultStatusDto | null;
    requestedAtUtc?: string | null;
    awaitingInterpretation?: boolean | null;
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
    /** `Requested` kayıtta null. */
    resultDateUtc?: string | null;
    testName?: string | null;
    /** `Requested` kayıtta null. */
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    status?: LabResultStatusDto | null;
    requestedAtUtc?: string | null;
    awaitingInterpretation?: boolean | null;
    cancelledAtUtc?: string | null;
    cancelReason?: string | null;
    /** Base64; PUT ve cancel'da geri gönderilir. */
    rowVersion?: string | null;
}

/**
 * POST / PUT body. `resultDateUtc` ve `resultText` birlikte verilir ya da birlikte verilmez
 * (ikisi de yok → `Requested` istem).
 */
export interface LabResultWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    resultDateUtc?: string | null;
    testName: string;
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    /** Yalnız PUT. */
    rowVersion?: string;
}

/** POST `/lab-results/{id}/cancel` body. */
export interface LabResultCancelRequestDto {
    reason: string;
    rowVersion: string;
}
