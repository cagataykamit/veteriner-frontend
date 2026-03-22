/**
 * Yeni muayene oluşturma — UI / servis isteği.
 */

export interface CreateExaminationRequest {
    clientId: string;
    petId: string;
    examinationDateUtc: string;
    complaint?: string;
    notes?: string;
    findings?: string;
    diagnosis?: string;
}
