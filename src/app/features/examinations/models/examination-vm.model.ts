/**
 * Muayene — UI view modelleri.
 */

export interface ExaminationListItemVm {
    id: string;
    examinationDateUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    status: string | null;
    lifecycleStatus: string | null;
    complaint: string;
    createdAtUtc: string | null;
}

export interface ExaminationDetailVm {
    id: string;
    examinationDateUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    status: string | null;
    lifecycleStatus: string | null;
    complaint: string;
    notes: string;
    findings: string;
    diagnosis: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface ExaminationEditVm {
    id: string;
    clientId: string;
    petId: string;
    examinationDateUtc: string | null;
    status: string;
    complaint: string;
    notes: string;
    findings: string;
    diagnosis: string;
}
