/** Ham API DTO’ları — Swagger ile uyumlu; eksik alanlar ileride genişletilebilir. */

export interface PetListItemDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    name?: string | null;
    speciesId?: string | null;
    speciesName?: string | null;
    breedId?: string | null;
    breedName?: string | null;
    breed?: string | null;
    colorId?: string | null;
    colorName?: string | null;
    /** Eski yanıtlar: düz metin renk (gösterim yedeği). */
    color?: string | null;
    weight?: number | null;
}

export interface PetListItemDtoPagedResult {
    items?: PetListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /pets/{id} — ırk/cinsiyet `breedId` / `gender` ile hizalanır; metin yedekleri `breedName` / `breed`. */
export interface PetDetailDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    name?: string | null;
    speciesId?: string | null;
    speciesName?: string | null;
    /** Referans ırk kimliği (edit form `breedId` seçici). */
    breedId?: string | null;
    breedName?: string | null;
    breed?: string | null;
    /** Backend `PetGender` (1=Male, 2=Female) veya metin; form `male`/`female` mapper’da çözülür. */
    gender?: string | number | null;
    birthDate?: string | null;
    birthDateUtc?: string | null;
    colorId?: string | null;
    colorName?: string | null;
    /** Eski okuma yedeği. */
    color?: string | null;
    weight?: number | null;
    notes?: string | null;
    ownerId?: string | null;
    /** Yeni contract: sahip metin alanları (öncelikli okuma). */
    clientName?: string | null;
    clientPhone?: string | null;
    clientEmail?: string | null;
    /** Eski / alternatif sahip alanları (mapper yedeği). */
    ownerName?: string | null;
    ownerPhone?: string | null;
    vaccinationsSummary?: PetVaccinationsSummaryDto | null;
    examinationsSummary?: PetExaminationsSummaryDto | null;
    appointmentsSummary?: PetAppointmentsSummaryDto | null;
}

export interface PetVaccinationsSummaryDto {
    totalCount?: number;
    items?: { id: string; name?: string | null }[] | null;
}

export interface PetExaminationsSummaryDto {
    totalCount?: number;
    lastExaminedAtUtc?: string | null;
}

export interface PetAppointmentsSummaryDto {
    totalCount?: number;
    upcomingCount?: number | null;
}

/** GET /pets/{id}/history-summary — hasta geçmişi özeti (blok başına en fazla 10 kayıt). */
export interface PetHistorySummaryDto {
    petId: string;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    recentAppointments?: PetHistoryAppointmentItemDto[] | null;
    recentExaminations?: PetHistoryExaminationItemDto[] | null;
    recentTreatments?: PetHistoryTreatmentItemDto[] | null;
    recentPrescriptions?: PetHistoryPrescriptionItemDto[] | null;
    recentLabResults?: PetHistoryLabResultItemDto[] | null;
    recentHospitalizations?: PetHistoryHospitalizationItemDto[] | null;
    recentPayments?: PetHistoryPaymentItemDto[] | null;
}

export interface PetHistoryAppointmentItemDto {
    id: string;
    scheduledAtUtc?: string | null;
    status?: number | string | null;
    appointmentType?: number | string | null;
    appointmentTypeName?: string | null;
    notes?: string | null;
    clinicName?: string | null;
}

export interface PetHistoryExaminationItemDto {
    id: string;
    examinedAtUtc?: string | null;
    visitReason?: string | null;
    clinicName?: string | null;
}

export interface PetHistoryTreatmentItemDto {
    id: string;
    treatmentDateUtc?: string | null;
    title?: string | null;
    clinicName?: string | null;
}

export interface PetHistoryPrescriptionItemDto {
    id: string;
    prescribedAtUtc?: string | null;
    title?: string | null;
    clinicName?: string | null;
}

export interface PetHistoryLabResultItemDto {
    id: string;
    resultDateUtc?: string | null;
    testName?: string | null;
    clinicName?: string | null;
}

export interface PetHistoryHospitalizationItemDto {
    id: string;
    admittedAtUtc?: string | null;
    reason?: string | null;
    dischargedAtUtc?: string | null;
    isActive?: boolean | null;
    clinicName?: string | null;
}

export interface PetHistoryPaymentItemDto {
    id: string;
    paidAtUtc?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: number | string | null;
    clinicName?: string | null;
}

/**
 * POST /pets gövdesi — camelCase (Swagger ile doğrulanmalı).
 * Opsiyonel alanlar backend’de yoksa mapper’da çıkarılabilir.
 */
export interface PetCreateRequestDto {
    clientId: string;
    name: string;
    speciesId: string;
    /** Yeni contract: referans kimliği */
    breedId?: string | null;
    /** Geçici geri uyumluluk: eski backend text `breed` bekleyebilir. */
    breed?: string | null;
    /** Backend `PetGender` enum: Male = 1, Female = 2. Boşsa alan gönderilmez. */
    gender?: number | null;
    /** DateOnly (yyyy-MM-dd) */
    birthDate?: string | null;
    colorId?: string | null;
    weight?: number | null;
    notes?: string | null;
}
