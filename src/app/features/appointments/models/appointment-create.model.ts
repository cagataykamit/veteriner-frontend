/**
 * Yeni randevu oluşturma — UI / servis isteği.
 */

export interface CreateAppointmentRequest {
    clinicId?: string;
    petId: string;
    scheduledAtUtc: string;
    /** Backend `AppointmentType` int enum. */
    appointmentType: number;
    /** Create için opsiyonel; yoksa backend Scheduled (=0). */
    status?: number | null;
    notes?: string;
}

export interface UpdateAppointmentRequest {
    /** PUT body içinde zorunlu (backend contract). */
    id: string;
    clinicId?: string;
    petId: string;
    scheduledAtUtc: string;
    appointmentType: number;
    /** Update için zorunlu (0/1/2). */
    status: number;
    notes?: string;
}
