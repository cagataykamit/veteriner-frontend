/**
 * Backend Veteriner API — muayene DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface ExaminationListItemDto {
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
    /** Audit — API eksik döndürebilir; mapper null kabul eder. */
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST/PUT body — `visitReason` zorunlu (max 2000, sunucu doğrulaması).
 * Eski `complaint` alias yalnızca backend isteğinde; istemci göndermez.
 */
export interface ExaminationCreateRequestDto {
    appointmentId?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    examinedAtUtc: string;
    visitReason: string;
    findings: string;
    assessment?: string | null;
    notes?: string | null;
}
