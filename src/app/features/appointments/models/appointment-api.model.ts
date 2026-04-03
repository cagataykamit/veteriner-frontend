/**
 * Backend Veteriner API — randevu DTO’ları (resmi contract).
 * Randevu türü: `appointmentType` (int enum). Hayvan türü: `speciesName` / `speciesId`.
 * Eski `type` alanı kaldırıldı — kullanılmaz.
 */

export interface AppointmentListItemDto {
    id: string;
    tenantId?: string;
    scheduledAtUtc?: string | null;
    clientId?: string | null;
    /** Batch listelerde müşteri kimliği bu alias ile gelebilir. */
    ownerId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    /** Hayvan türü (örn. Köpek) — randevu türü değildir. */
    speciesId?: string | null;
    speciesName?: string | null;
    /** Randevu türü — int enum (`AppointmentType`). */
    appointmentType?: number | string | null;
    appointmentTypeName?: string | null;
    status?: string | number | null;
    appointmentStatus?: string | number | null;
    lifecycleStatus?: string | number | null;
    lifecycle?: string | number | null;
    createdAtUtc?: string | null;
}

export interface AppointmentListItemDtoPagedResult {
    items?: AppointmentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /appointments/{id} */
export interface AppointmentDetailDto {
    id: string;
    tenantId?: string;
    scheduledAtUtc?: string | null;
    scheduledAt?: string | null;
    startAtUtc?: string | null;
    startsAtUtc?: string | null;
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    speciesId?: string | null;
    speciesName?: string | null;
    appointmentType?: number | string | null;
    appointmentTypeName?: string | null;
    status?: string | number | null;
    appointmentStatus?: string | number | null;
    lifecycleStatus?: string | number | null;
    lifecycle?: string | number | null;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/** POST/PUT /appointments body — durum backend’de ayrı iş akışlarıyla yönetilir; gövdede yok. */
export interface AppointmentCreateRequestDto {
    clinicId?: string | null;
    petId: string;
    scheduledAtUtc: string;
    appointmentType: number;
    /**
     * Backend `AppointmentStatus` (0/1/2). Create için opsiyonel:
     * gönderilmezse backend Scheduled (=0) başlatır.
     */
    status?: number | null;
    notes?: string | null;
}

/** PUT /appointments body (güncelleme) — id + status zorunlu. */
export interface AppointmentUpdateRequestDto {
    id: string;
    clinicId?: string | null;
    petId: string;
    scheduledAtUtc: string;
    appointmentType: number;
    /** Backend `AppointmentStatus` (0/1/2) — update için zorunlu. */
    status: number;
    notes?: string | null;
}
