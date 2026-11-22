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
    /** Kesinleşmiş muayeneye sonradan eklendi (ADR-043 AK-4; rozet, gerekçe yok). */
    addedAfterFinalization?: boolean | null;
    /** Değer satırları (`docs/LAB_RESULT_LINES_API_CONTRACT.md`); satır yoksa boş dizi. */
    lines?: LabResultLineDto[] | null;
}

/** Sonuçla gelen referans aralığına göre sunucunun hesapladığı işaret; aralık yoksa null. */
export type LabValueFlagDto = 'Low' | 'Normal' | 'High';
/** Aynı parametrenin önceki (aynı birimli) değerine göre yön. */
export type LabValueTrendDto = 'Down' | 'Unchanged' | 'Up';

export interface LabResultLineDto {
    id: string;
    sortOrder: number;
    parameterName: string;
    value: number;
    unit?: string | null;
    referenceLow?: number | null;
    referenceHigh?: number | null;
    flag?: LabValueFlagDto | null;
    previous?: { labResultId: string; resultDateUtc: string; value: number; flag?: LabValueFlagDto | null } | null;
    trend?: LabValueTrendDto | null;
}

/** GET `/lab-results/parameter-history`; yeniden eskiye. */
export interface LabParameterHistoryPointDto {
    labResultId: string;
    resultDateUtc: string;
    testName: string;
    parameterName: string;
    value: number;
    unit?: string | null;
    referenceLow?: number | null;
    referenceHigh?: number | null;
    flag?: LabValueFlagDto | null;
}

export interface LabResultLineWriteDto {
    parameterName: string;
    value: number;
    unit?: string | null;
    referenceLow?: number | null;
    referenceHigh?: number | null;
}

/**
 * POST / PUT body. Sonuç (metin ya da en az bir değer satırı) ile `resultDateUtc` birlikte verilir ya da birlikte
 * verilmez (ikisi de yok → `Requested` istem).
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
    /** PUT'ta verilmezse sunucu mevcut satırları korur; `[]` hepsini siler. */
    lines?: LabResultLineWriteDto[];
    /** Yalnız PUT. */
    rowVersion?: string;
}

/** POST `/lab-results/{id}/cancel` body. */
export interface LabResultCancelRequestDto {
    reason: string;
    rowVersion: string;
}
