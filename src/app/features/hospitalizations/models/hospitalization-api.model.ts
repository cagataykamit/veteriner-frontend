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
    visitId?: string | null;
    location?: string | null;
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
    visitId?: string | null;
    location?: string | null;
    admittedAtUtc?: string | null;
    plannedDischargeAtUtc?: string | null;
    dischargedAtUtc?: string | null;
    reason?: string | null;
    notes?: string | null;
    dischargeNote?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    isActive?: boolean | null;
    rowVersion?: string | null;
}

/** POST create / PUT update body — API ile uyumlu. */
export interface HospitalizationWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    /** PUT’ta yok/`null` = mevcut bağı koru veya muayeneden miras al. */
    visitId?: string | null;
    /** PUT’ta yok/`null` = dokunma, boş metin = temizle. */
    location?: string | null;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
    /** Yalnız PUT; GET’ten alınan sürüm. */
    rowVersion?: string;
}

export interface DischargeHospitalizationRequestDto {
    dischargedAtUtc: string;
    /** Giriş notunu (`notes`) ezmez; yok/`null` = dokunma. */
    dischargeNote?: string | null;
    rowVersion?: string;
}

/** PUT ve taburcu yanıtı (200). */
export interface HospitalizationWriteResultDto {
    id: string;
    rowVersion?: string | null;
}
