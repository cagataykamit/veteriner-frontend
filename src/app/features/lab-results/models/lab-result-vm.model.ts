/**
 * Lab Results — UI view modelleri.
 */

export interface LabResultListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    resultDateUtc: string | null;
    testName: string;
    examinationId: string | null;
}

export interface LabResultDetailVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    examinationId: string | null;
    resultDateUtc: string | null;
    testName: string;
    resultText: string;
    interpretation: string;
    notes: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface LabResultEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    resultDateUtc: string | null;
    testName: string;
    resultText: string;
    interpretation: string;
    notes: string;
}
