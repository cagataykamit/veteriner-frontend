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
    anamnesis: string;
    plan: string;
    weightKg: number | null;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    vitalsMeasuredAtUtc: string | null;
    rowVersion: string | null;
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

/** Çalışma alanı formunu dolduran okuma modeli. Boş metin `''`; ölçülmeyen vital `null`. */
export interface ExaminationEditVm {
    id: string;
    clinicId: string;
    clientId: string;
    petId: string;
    /** Başlıkta gösterim için (detay yanıtından). */
    clientName: string | null;
    petName: string | null;
    appointmentId: string | null;
    examinedAtUtc: string | null;
    visitReason: string;
    anamnesis: string;
    findings: string;
    weightKg: number | null;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    vitalsMeasuredAtUtc: string | null;
    assessment: string;
    plan: string;
    notes: string;
    /** PUT'ta aynen geri gönderilir. */
    rowVersion: string;
}

export interface ExaminationWriteResultVm {
    id: string;
    /** Yanıtta yoksa null (sunucu sözleşmesi dışı). */
    rowVersion: string | null;
}
