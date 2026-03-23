/**
 * Backend Veteriner API — muayene DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface ExaminationListItemDto {
    id: string;
    tenantId?: string;
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
    status?: string | null;
    examinationStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    complaint?: string | null;
    complaintText?: string | null;
    createdAtUtc?: string | null;
}

export interface ExaminationListItemDtoPagedResult {
    items?: ExaminationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ExaminationDetailDto {
    id: string;
    tenantId?: string;
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
    status?: string | null;
    examinationStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    complaint?: string | null;
    complaintText?: string | null;
    notes?: string | null;
    note?: string | null;
    findings?: string | null;
    finding?: string | null;
    diagnosis?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/** POST body — alan adları API ile uyumlu. */
export interface ExaminationCreateRequestDto {
    clientId: string;
    petId: string;
    examinationDateUtc: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri `scheduledAtUtc` bekleyebilir. */
    scheduledAtUtc?: string | null;
    /** Geçici geri uyumluluk: bazı backend sürümleri `appointmentId` kabul edebilir. */
    appointmentId?: string | null;
    complaint?: string | null;
    complaintText?: string | null;
    notes?: string | null;
    note?: string | null;
    findings?: string | null;
    finding?: string | null;
    diagnosis?: string | null;
}
