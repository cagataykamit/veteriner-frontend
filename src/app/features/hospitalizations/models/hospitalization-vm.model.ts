/**
 * Hospitalizations — UI view modelleri.
 */

export interface HospitalizationListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    visitId: string | null;
    location: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    dischargedAtUtc: string | null;
    reason: string;
    isActive: boolean;
}

export interface HospitalizationDetailVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    visitId: string | null;
    location: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    dischargedAtUtc: string | null;
    reason: string;
    notes: string;
    dischargeNote: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    isActive: boolean;
    /** Yazma çağrılarına aynen geri gönderilir. */
    rowVersion: string;
}

export interface HospitalizationEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    visitId: string;
    location: string;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    reason: string;
    notes: string;
    isActive: boolean;
    rowVersion: string;
}
