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
    status: string | null;
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
    status: string | null;
    complaint: string;
    notes: string;
    findings: string;
    diagnosis: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}
