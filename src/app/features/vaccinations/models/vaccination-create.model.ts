/**
 * Yeni aşı kaydı — UI / servis isteği.
 * `appliedAtUtc` / `nextDueAtUtc` ISO UTC (formda `date.utils` ile üretilir).
 * `clientId` yalnızca formda müşteri seçimini tutar; API gövdesine mapper karar verir (varsayılan: gönderilmez).
 */

export interface CreateVaccinationRequest {
    petId: string;
    /** Form seçimi — API istemiyorsa mapper çıkarır */
    clientId?: string;
    vaccineName: string;
    appliedAtUtc: string;
    nextDueAtUtc?: string;
    status?: string;
    notes?: string;
}
