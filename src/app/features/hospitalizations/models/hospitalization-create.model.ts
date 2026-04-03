/**
 * Yatış oluşturma / güncelleme — servis isteği.
 */

export interface CreateHospitalizationRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
}

export interface DischargeHospitalizationRequest {
    dischargedAtUtc: string;
    notes?: string | null;
}
