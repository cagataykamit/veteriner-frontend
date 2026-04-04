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
    visitReason: string;
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
    visitReason: string;
    notes: string;
    findings: string;
    assessment: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

/** GET /examinations/{id}/related-summary */
export interface ExaminationRelatedTreatmentItemVm {
    id: string;
    treatmentDateUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    title: string;
}

export interface ExaminationRelatedPrescriptionItemVm {
    id: string;
    prescribedAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    title: string;
    treatmentId: string | null;
}

export interface ExaminationRelatedLabResultItemVm {
    id: string;
    resultDateUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    testName: string;
}

export interface ExaminationRelatedHospitalizationItemVm {
    id: string;
    admittedAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    reason: string;
    dischargedAtUtc: string | null;
    isActive: boolean;
}

export interface ExaminationRelatedPaymentItemVm {
    id: string;
    paidAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    amount: number | null;
    currency: string | null;
    method: unknown;
}

export interface ExaminationRelatedSummaryVm {
    examinationId: string;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    treatments: ExaminationRelatedTreatmentItemVm[];
    prescriptions: ExaminationRelatedPrescriptionItemVm[];
    labResults: ExaminationRelatedLabResultItemVm[];
    hospitalizations: ExaminationRelatedHospitalizationItemVm[];
    payments: ExaminationRelatedPaymentItemVm[];
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
