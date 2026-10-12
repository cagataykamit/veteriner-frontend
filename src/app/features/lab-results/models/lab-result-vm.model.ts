/**
 * Lab Results — UI view modelleri.
 */

export type LabResultStatus = 'Requested' | 'Resulted' | 'Cancelled';

export interface LabResultListItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    /** `Requested` kayıtta null. */
    resultDateUtc: string | null;
    requestedAtUtc: string | null;
    status: LabResultStatus | null;
    awaitingInterpretation: boolean;
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
    requestedAtUtc: string | null;
    status: LabResultStatus | null;
    awaitingInterpretation: boolean;
    testName: string;
    /** Sonuç girilmemişse null. */
    resultText: string | null;
    interpretation: string;
    notes: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    cancelledAtUtc: string | null;
    cancelReason: string | null;
    rowVersion: string;
}

export interface LabResultEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    examinationId: string;
    status: LabResultStatus | null;
    resultDateUtc: string | null;
    testName: string;
    resultText: string;
    interpretation: string;
    notes: string;
    rowVersion: string;
}
