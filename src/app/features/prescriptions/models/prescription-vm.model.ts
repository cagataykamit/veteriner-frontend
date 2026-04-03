/**
 * Reçete — UI view modelleri.
 */

export interface PrescriptionListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    prescribedAtUtc: string | null;
    title: string;
    examinationId: string | null;
    treatmentId: string | null;
    followUpDateUtc: string | null;
}

export interface PrescriptionDetailVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    treatmentId: string | null;
    prescribedAtUtc: string | null;
    title: string;
    content: string;
    notes: string;
    followUpDateUtc: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface PrescriptionEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    treatmentId: string;
    prescribedAtUtc: string | null;
    title: string;
    content: string;
    notes: string;
    followUpDateInput: string;
}
