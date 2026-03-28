/**
 * Muayene — UI view modelleri.
 */

export interface ExaminationListItemVm {
    id: string;
    clinicId: string | null;
    clinicName: string | null;
    examinedAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    status: string | null;
    lifecycleStatus: string | null;
    visitReason: string;
    createdAtUtc: string | null;
}

export interface ExaminationDetailVm {
    id: string;
    clinicId: string | null;
    clinicName: string | null;
    examinedAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    status: string | null;
    lifecycleStatus: string | null;
    visitReason: string;
    notes: string;
    findings: string;
    assessment: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface ExaminationEditVm {
    id: string;
    clinicId: string;
    clinicName: string;
    clientId: string;
    petId: string;
    /** Dropdown sentetik etiket (liste dışı müşteri). */
    clientName: string | null;
    /** Dropdown sentetik etiket (liste dışı hayvan). */
    petName: string | null;
    examinedAtUtc: string | null;
    visitReason: string;
    notes: string;
    findings: string;
    assessment: string;
}
