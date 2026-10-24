/**
 * Backend Veteriner API — muayene DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

/** `status` JSON'da string enum (`docs/EXAMINATION_FINALIZE_API_CONTRACT.md`). */
export type ExaminationStatusDto = 'Draft' | 'Finalized';

export interface ExaminationListItemDto {
    status?: string | null;
    /** Bazı rapor yanıtlarında `id` ile birlikte veya onun yerine gelebilir. */
    examinationId?: string | null;
    id: string;
    tenantId?: string;
    clinicId?: string | null;
    clinicName?: string | null;
    examinedAtUtc?: string | null;
    examinationDateUtc?: string | null;
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    appointmentId?: string | null;
    /** Yanıtta canonical alan; `complaint` sunucu yanıtında dönmez. */
    visitReason?: string | null;
    findings?: string | null;
    finding?: string | null;
    assessment?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    note?: string | null;
}

export interface ExaminationListItemDtoPagedResult {
    items?: ExaminationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * GET /examinations/{id}
 * Çekirdek: … examinedAtUtc, visitReason (canonical), findings, assessment, notes, appointmentId?
 * Audit: createdAtUtc, updatedAtUtc
 */
/** GET /examinations/{id}/related-summary — muayeneye bağlı tedavi, reçete, lab, yatış, ödeme özeti. */
export interface ExaminationRelatedSummaryDto {
    examinationId: string;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    treatments?: ExaminationRelatedTreatmentItemDto[] | null;
    prescriptions?: ExaminationRelatedPrescriptionItemDto[] | null;
    labResults?: ExaminationRelatedLabResultItemDto[] | null;
    hospitalizations?: ExaminationRelatedHospitalizationItemDto[] | null;
    /** Yalnız Vaccinations.Read izni varsa dolu; izinsizde [] (kayıt yok ile ayırt edilemez). */
    vaccinations?: ExaminationRelatedVaccinationItemDto[] | null;
    /** Yalnız Imaging.Read izni varsa dolu; izinsizde [] (kayıt yok ile ayırt edilemez). */
    imaging?: ExaminationRelatedImagingItemDto[] | null;
    payments?: ExaminationRelatedPaymentItemDto[] | null;
    /** Muayeneye bağlı ücret bekleyen kalem sayısı (ADR-018); `Charges.Read` yoksa `null`. */
    pendingChargeCount?: number | null;
}

export interface ExaminationRelatedTreatmentItemDto {
    id: string;
    treatmentDateUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    title?: string | null;
}

export interface ExaminationRelatedPrescriptionItemDto {
    id: string;
    prescribedAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    title?: string | null;
    treatmentId?: string | null;
}

export interface ExaminationRelatedLabResultItemDto {
    id: string;
    resultDateUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    testName?: string | null;
    status?: string | null;
    requestedAtUtc?: string | null;
    awaitingInterpretation?: boolean | null;
}

export interface ExaminationRelatedVaccinationItemDto {
    id: string;
    vaccineName?: string | null;
    /** Scheduled | Applied | Cancelled (string enum). */
    status?: string | null;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
}

export interface ExaminationRelatedImagingItemDto {
    id: string;
    performedAtUtc?: string | null;
    /** XRay | Ultrasound | CT | MRI | Endoscopy | ClinicalPhoto | Other (string enum). */
    modality?: string | null;
    description?: string | null;
    /** Active | Cancelled (string enum). */
    status?: string | null;
    addedAfterFinalization?: boolean | null;
    clinicId?: string | null;
    clinicName?: string | null;
}

export interface ExaminationRelatedHospitalizationItemDto {
    id: string;
    admittedAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    reason?: string | null;
    dischargedAtUtc?: string | null;
    isActive?: boolean | null;
}

export interface ExaminationRelatedPaymentItemDto {
    id: string;
    paidAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: number | string | null;
}

export interface ExaminationDetailDto {
    id: string;
    tenantId?: string;
    clinicId?: string | null;
    clinicName?: string | null;
    examinedAtUtc?: string | null;
    examinationDateUtc?: string | null;
    /** Müşteri seçimi / detay gösterimi için. */
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    appointmentId?: string | null;
    visitReason?: string | null;
    notes?: string | null;
    note?: string | null;
    findings?: string | null;
    finding?: string | null;
    assessment?: string | null;
    diagnosis?: string | null;
    /** Dilim 1 — eski kayıtlarda null olabilir. */
    anamnesis?: string | null;
    plan?: string | null;
    weightKg?: number | null;
    temperatureC?: number | null;
    heartRateBpm?: number | null;
    respiratoryRatePerMin?: number | null;
    vitalsMeasuredAtUtc?: string | null;
    status?: string | null;
    finalizedAtUtc?: string | null;
    finalizedByUserId?: string | null;
    finalizedByName?: string | null;
    /** Base64 (SQL rowversion); PUT'ta zorunlu. */
    rowVersion?: string | null;
    /** Audit — API eksik döndürebilir; mapper null kabul eder. */
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST/PUT body — `visitReason` zorunlu (max 2000, sunucu doğrulaması).
 * Eski `complaint` alias yalnızca backend isteğinde; istemci göndermez.
 * `rowVersion` yalnızca PUT'ta gönderilir (zorunlu).
 */
export interface ExaminationUpsertRequestDto {
    appointmentId?: string | null;
    /** Geliş (Visit) bağlantısı; verilirse klinik/hayvan/randevu sunucuda Visit'ten türetilir. */
    visitId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    examinedAtUtc: string;
    visitReason: string;
    anamnesis: string | null;
    findings: string;
    weightKg: number | null;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    vitalsMeasuredAtUtc: string | null;
    assessment: string | null;
    plan: string | null;
    notes: string | null;
}

/**
 * PUT body — kısmi güncelleme: gövdede olmayan/`null` alan mevcut değeri korur.
 * Metni silmek için `""` gönderilir. Vitalleri silmek için yalnızca `clearVitals: true`
 * (vital değerlerle birlikte gönderilmez). `rowVersion`, `examinedAtUtc`, `visitReason` her istekte zorunlu.
 */
export interface ExaminationUpdateRequestDto {
    appointmentId?: string;
    clinicId: string;
    petId: string;
    examinedAtUtc: string;
    visitReason: string;
    anamnesis: string;
    findings: string;
    assessment: string;
    plan: string;
    notes: string;
    weightKg?: number;
    temperatureC?: number;
    heartRateBpm?: number;
    respiratoryRatePerMin?: number;
    vitalsMeasuredAtUtc?: string;
    clearVitals?: true;
    rowVersion: string;
}

/** POST 201 / PUT 200 yanıtı. */
export interface ExaminationWriteResultDto {
    id: string;
    rowVersion?: string | null;
}

/** POST /examinations/{id}/finalize 200 yanıtı. */
export interface ExaminationFinalizeResultDto {
    id: string;
    rowVersion?: string | null;
    status?: string | null;
    finalizedAtUtc?: string | null;
    finalizedByUserId?: string | null;
}

/** GET/POST /examinations/{id}/addenda — `ExaminationAddendumDto`. */
export interface ExaminationAddendumDto {
    id: string;
    examinationId?: string | null;
    reason?: string | null;
    text?: string | null;
    createdAtUtc?: string | null;
    createdByUserId?: string | null;
    createdByName?: string | null;
}
