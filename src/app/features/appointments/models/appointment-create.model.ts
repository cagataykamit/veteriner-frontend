/**
 * Yeni randevu oluşturma — UI / servis isteği.
 */

export interface CreateAppointmentRequest {
    clientId: string;
    petId: string;
    scheduledAtUtc: string;
    type?: string;
    reason?: string;
    notes?: string;
}
