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
    /** Kesinleşmiş muayeneye sonradan eklendi (ADR-043 AK-4). */
    addedAfterFinalization?: boolean;
    lines: LabResultLineVm[];
}

export type LabValueFlag = 'Low' | 'Normal' | 'High';
export type LabValueTrend = 'Down' | 'Unchanged' | 'Up';

/** Değer satırı; işaret ve önceki değer sunucudan gelir (kural backend'de). */
export interface LabResultLineVm {
    parameterName: string;
    value: number;
    unit: string | null;
    referenceLow: number | null;
    referenceHigh: number | null;
    flag: LabValueFlag | null;
    previous: { labResultId: string; resultDateUtc: string; value: number; flag: LabValueFlag | null } | null;
    trend: LabValueTrend | null;
}

export interface LabParameterHistoryPointVm {
    labResultId: string;
    resultDateUtc: string;
    testName: string;
    value: number;
    unit: string | null;
    referenceLow: number | null;
    referenceHigh: number | null;
    flag: LabValueFlag | null;
}

/** Formdaki değer satırı (sayılar metin girişinden çözülmüş). */
export interface LabResultLineInput {
    parameterName: string;
    value: number;
    unit: string | null;
    referenceLow: number | null;
    referenceHigh: number | null;
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
    lines: LabResultLineInput[];
}
