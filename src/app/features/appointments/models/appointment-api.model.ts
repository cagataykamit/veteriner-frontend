/**
 * Backend Veteriner API — randevu listesi DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface AppointmentListItemDto {
    id: string;
    tenantId?: string;
    scheduledAtUtc?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    type?: string | null;
    appointmentType?: string | null;
    status?: string | null;
    reason?: string | null;
    createdAtUtc?: string | null;
}

export interface AppointmentListItemDtoPagedResult {
    items?: AppointmentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /appointments/{id} — alanlar backend şemasına göre genişletilebilir. */
export interface AppointmentDetailDto {
    id: string;
    tenantId?: string;
    scheduledAtUtc?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    type?: string | null;
    appointmentType?: string | null;
    status?: string | null;
    reason?: string | null;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST /appointments body — alan adları API ile uyumlu (camelCase).
 * Varsayım: backend bu gövdeyi kabul eder; şema farklıysa mapper güncellenir.
 */
export interface AppointmentCreateRequestDto {
    clientId: string;
    petId: string;
    scheduledAtUtc: string;
    type?: string | null;
    reason?: string | null;
    notes?: string | null;
}
