import type { PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';

/** "Kayıt yok" (`Empty`), "yetki yok" (`Forbidden`) ve "veri alınamadı" (`Unavailable`) ayrı durumlardır. */
export type PetSummarySectionState = 'Ok' | 'Empty' | 'Forbidden' | 'Unavailable';

/** `state !== 'Ok'` iken `data` her zaman `null`. */
export interface PetSummarySectionVm<T> {
    state: PetSummarySectionState;
    data: T | null;
}

export interface PetSummaryHospitalizationVm {
    id: string;
    clinicName: string | null;
    admittedAtUtc: string | null;
    plannedDischargeAtUtc: string | null;
    reason: string | null;
    examinationId: string | null;
}

export interface PetSummaryAppliedVaccinationVm {
    id: string;
    vaccineName: string;
    appliedAtUtc: string | null;
}

export interface PetSummaryDueVaccinationVm {
    id: string;
    vaccineName: string;
    dueAtUtc: string | null;
    isOverdue: boolean;
}

export interface PetSummaryVaccinationsVm {
    lastApplied: PetSummaryAppliedVaccinationVm | null;
    nextDue: PetSummaryDueVaccinationVm | null;
}

export interface PetSummaryWeightVm {
    weightKg: number;
    measuredAtUtc: string | null;
    examinationId: string | null;
}

export interface PetSummaryVisitVm {
    id: string;
    arrivedAtUtc: string | null;
    careStatus: string | null;
    clinicName: string | null;
}

export interface PetSummaryExaminationVm {
    id: string;
    examinedAtUtc: string | null;
    visitReason: string | null;
    clinicName: string | null;
}

export interface PetSummaryVm {
    petId: string;
    petAlerts: PetAlertsVm;
    /** Tarihsiz profil kilosu (`Pet.Weight`); muayeneden türetilen `latestWeight` ile karıştırılmaz. */
    profileWeightKg: number | null;
    activeHospitalization: PetSummarySectionVm<PetSummaryHospitalizationVm>;
    vaccinations: PetSummarySectionVm<PetSummaryVaccinationsVm>;
    latestWeight: PetSummarySectionVm<PetSummaryWeightVm>;
    lastVisit: PetSummarySectionVm<PetSummaryVisitVm>;
    lastExamination: PetSummarySectionVm<PetSummaryExaminationVm>;
}
