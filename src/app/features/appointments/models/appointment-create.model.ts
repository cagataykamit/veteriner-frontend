/**
 * Yeni randevu oluşturma — UI / servis isteği.
 */

export interface CreateAppointmentRequest {
    clinicId?: string;
    clientId: string;
    petId: string;
    scheduledAtUtc: string;
    type?: string;
    /** Boş bırakılırsa mapper `scheduled` ile doldurur (write tekilleştirme). */
    status?: string;
    reason?: string;
    notes?: string;
}
