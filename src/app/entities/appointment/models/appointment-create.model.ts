/**
 * Yeni randevu oluşturma — UI / servis isteği.
 */

export interface CreateAppointmentRequest {
    clinicId?: string;
    petId: string;
    scheduledAtUtc: string;
    durationMinutes: number;
    /** Backend `AppointmentType` int enum. */
    appointmentType: number;
    /** Create için opsiyonel; yoksa backend Scheduled (=0). */
    status?: number | null;
    notes?: string;
    reasonId?: string | null;
    veterinarianUserId?: string | null;
    /** Oda ve cihaz (ADR-053; APPOINTMENT_RESOURCES_API_CONTRACT.md §2). */
    roomResourceId?: string | null;
    equipmentResourceId?: string | null;
}

export interface UpdateAppointmentRequest {
    /** PUT body içinde zorunlu (backend contract). */
    id: string;
    clinicId?: string;
    petId: string;
    scheduledAtUtc: string;
    durationMinutes: number;
    appointmentType: number;
    /** Update için zorunlu: mevcut durum aynen gönderilir (durum değişimi `PUT` ile yapılmaz; `Appointments.InvalidStatusTransition`). */
    status: number;
    notes?: string;
    reasonId?: string | null;
    veterinarianUserId?: string | null;
    /** Oda ve cihaz (ADR-053; APPOINTMENT_RESOURCES_API_CONTRACT.md §2). */
    roomResourceId?: string | null;
    equipmentResourceId?: string | null;
}
