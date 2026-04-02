/**
 * Tedavi — UI view modelleri.
 */

export interface TreatmentListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    treatmentDateUtc: string | null;
    title: string;
    examinationId: string | null;
    followUpDateUtc: string | null;
}

export interface TreatmentDetailVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    treatmentDateUtc: string | null;
    title: string;
    description: string;
    notes: string;
    followUpDateUtc: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface TreatmentEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    treatmentDateUtc: string | null;
    title: string;
    description: string;
    notes: string;
    followUpDateInput: string;
}
