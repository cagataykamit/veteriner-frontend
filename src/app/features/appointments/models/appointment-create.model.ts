/**
 * Yeni randevu oluşturma — UI / servis isteği.
 */

export interface CreateAppointmentRequest {
    clinicId?: string;
    clientId: string;
    petId: string;
    scheduledAtUtc: string;
    type?: string;
    status?: string;
    reason?: string;
    notes?: string;
}
