/**
 * Reçete oluşturma / güncelleme — UI / servis isteği.
 */

export interface CreatePrescriptionRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    prescribedAtUtc: string;
    title: string;
    content: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
}
