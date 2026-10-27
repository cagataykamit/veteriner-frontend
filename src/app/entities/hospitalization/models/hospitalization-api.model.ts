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
    /** HOSP-002: klinik tanımlı oda; eski kayıtlarda `null`. Adlar tanımın o anki adıdır (pasifleşmiş olsa da döner). */
    roomId?: string | null;
    roomName?: string | null;
    wardName?: string | null;
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
    roomId?: string | null;
    roomName?: string | null;
    wardName?: string | null;
}

/** POST create / PUT update body — API ile uyumlu. */
export interface HospitalizationWriteRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    /** PUT’ta yok/`null` = mevcut bağı koru veya muayeneden miras al. */
    visitId?: string | null;
    /** PUT’ta yok/`null` = dokunma, boş metin = temizle; `roomId` varsa sunucu yok sayar ("Bölüm / Oda" türetir). */
    location?: string | null;
    /** HOSP-002 (§10.4): yatışın kliniğindeki aktif oda. PUT’ta yok/`null` = oda bağına dokunma. */
    roomId?: string | null;
    /** Yalnız PUT: `true` = oda bağını kaldır; `roomId` ile birlikte gönderilemez (400). */
    clearRoom?: boolean;
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
