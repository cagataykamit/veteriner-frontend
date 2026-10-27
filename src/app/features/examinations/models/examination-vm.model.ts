import type { LabResultStatus } from '@/app/entities/lab-result/models/lab-result-vm.model';
/**
 * Muayene — UI view modelleri.
 */

import type { ExaminationStatusDto } from '@/app/features/examinations/models/examination-api.model';

/** Eski/eksik değer `Draft` sayılır (kilit kararı her zaman backend'dedir). */
export type ExaminationStatus = ExaminationStatusDto;

export interface ExaminationListItemVm {
    /** Liste uç yanıtında vardır; durum bilmeyen kaynaklarda (müşteri özeti, ilişki seçicileri) yok/`null`. */
    status?: ExaminationStatus | null;
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
    status: ExaminationStatus;
    finalizedAtUtc: string | null;
    finalizedByName: string | null;
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
    status: LabResultStatus | null;
    requestedAtUtc: string | null;
    awaitingInterpretation: boolean;
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

export type ExaminationRelatedVaccinationStatus = 'Scheduled' | 'Applied' | 'Cancelled';

export interface ExaminationRelatedVaccinationItemVm {
    id: string;
    vaccineName: string;
    status: ExaminationRelatedVaccinationStatus;
    appliedAtUtc: string | null;
    dueAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
}

export interface ExaminationRelatedImagingItemVm {
    id: string;
    performedAtUtc: string | null;
    modality: string;
    description: string | null;
    cancelled: boolean;
    addedAfterFinalization: boolean;
    clinicId: string | null;
    clinicName: string | null;
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
    vaccinations: ExaminationRelatedVaccinationItemVm[];
    imaging: ExaminationRelatedImagingItemVm[];
    payments: ExaminationRelatedPaymentItemVm[];
    /** Ücret bekleyen kalem sayısı. `null`: yetki yok ("yok" anlamına gelmez). */
    pendingChargeCount: number | null;
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
    status: ExaminationStatus;
    /** PUT'ta aynen geri gönderilir. */
    rowVersion: string;
}

export interface ExaminationWriteResultVm {
    id: string;
    /** Yanıtta yoksa null (sunucu sözleşmesi dışı). */
    rowVersion: string | null;
}

/** POST /examinations/{id}/finalize sonucu; `rowVersion` yeni sürümdür. */
export interface ExaminationFinalizeResultVm {
    id: string;
    rowVersion: string | null;
    status: ExaminationStatus;
    finalizedAtUtc: string | null;
}

export interface ExaminationAddendumVm {
    id: string;
    reason: string;
    text: string;
    createdAtUtc: string | null;
    /** Ad çözülemediyse `null`. */
    createdByName: string | null;
}

