/**
 * Yeni aşı kaydı — UI / servis isteği.
 * `appliedAtUtc` / `nextDueAtUtc` ISO UTC (formda `date.utils` ile üretilir).
 * `clientId` yalnızca formda müşteri seçimini tutar; API gövdesine mapper karar verir (varsayılan: gönderilmez).
 */

export interface CreateVaccinationRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineName: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}

export interface UpdateVaccinationRequest {
    id?: string;
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineName: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}
