/**
 * Yeni muayene oluşturma — UI / servis isteği.
 */

export interface CreateExaminationRequest {
    /**
     * Randevudan create: appointmentId doluysa clinicId/petId backend tarafından çözülebilir.
     * Randevusuz create: appointmentId yoksa clinicId + petId birlikte zorunlu.
     */
    appointmentId?: string;
    clinicId?: string;
    petId?: string;
    examinedAtUtc: string;
    visitReason: string;
    findings: string;
    assessment?: string | null;
    notes?: string | null;
}
