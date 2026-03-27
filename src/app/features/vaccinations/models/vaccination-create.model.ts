/**
 * Yeni aşı kaydı — UI / servis isteği.
 * `appliedAtUtc` / `nextDueAtUtc` ISO UTC (formda `date.utils` ile üretilir).
 * `clientId` yalnızca formda müşteri seçimini tutar; API gövdesine mapper karar verir (varsayılan: gönderilmez).
 */

export interface CreateVaccinationRequest {
    clinicId?: string;
    petId: string;
    /** Form içi seçim için tutulur, create mapper canonical payload'a eklemez. */
    clientId?: string;
    examinationId?: string | null;
    vaccineName: string;
    status: string;
    appliedAtUtc?: string | null;
    /** Deprecated: create formu dueAtUtc kullanır; edit tarafı geçici olarak bunu doldurabilir. */
    nextDueAtUtc?: string;
    dueAtUtc?: string | null;
    notes?: string | null;
}
