import type { PetSummarySectionVm } from '@/app/features/pets/models/pet-summary-vm.model';

/** Planlı aşı; gecikmiş/yaklaşan ayrımı ve 30 günlük pencere sunucudadır. */
export interface PetOpenVaccinationVm {
    id: string;
    vaccineName: string;
    dueAtUtc: string | null;
}

export interface PetOpenVaccinationsVm {
    overdue: PetOpenVaccinationVm[];
    upcoming: PetOpenVaccinationVm[];
}

export interface PetOpenLabResultVm {
    id: string;
    testName: string;
    requestedAtUtc: string | null;
    resultDateUtc: string | null;
}

export interface PetOpenLabResultsVm {
    awaitingResult: PetOpenLabResultVm[];
    awaitingInterpretation: PetOpenLabResultVm[];
}

/** `totalAmount` yalnız fiyatlı kalemlerin toplamıdır; fiyatsız kalemler `unpricedCount` ile ayrı sayılır. */
export interface PetPendingChargesSummaryVm {
    count: number;
    totalAmount: number;
    unpricedCount: number;
    currency: string;
}

export interface PetNextAppointmentVm {
    id: string;
    scheduledAtUtc: string | null;
    durationMinutes: number | null;
    appointmentType: string | null;
    clinicName: string | null;
}

/** Borç müşterinindir (ADR-012): `client…` sahibin toplamı, `pet…` bu hayvana düşen pay. */
export interface PetOutstandingVm {
    petOutstandingAmount: number;
    petOpenChargeCount: number;
    clientOutstandingAmount: number;
    currency: string;
}

/** Hasta kartı "Yapılacaklar" (ADR-020 karar 2c): bölüm bazlı durumlu tek okuma. */
export interface PetOpenItemsVm {
    petId: string;
    clientId: string | null;
    status: string | null;
    asOfUtc: string | null;
    vaccinations: PetSummarySectionVm<PetOpenVaccinationsVm>;
    labResults: PetSummarySectionVm<PetOpenLabResultsVm>;
    pendingCharges: PetSummarySectionVm<PetPendingChargesSummaryVm>;
    nextAppointment: PetSummarySectionVm<PetNextAppointmentVm>;
    outstanding: PetSummarySectionVm<PetOutstandingVm>;
}
