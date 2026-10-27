/**
 * Tedavi oluşturma / güncelleme — UI / servis isteği.
 */

export interface CreateTreatmentRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentDateUtc: string;
    title: string;
    description: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
}
