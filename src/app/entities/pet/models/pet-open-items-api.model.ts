import type { PetSummarySectionDto } from '@/app/entities/pet/models/pet-summary-api.model';

/** GET /pets/{id}/open-items — `docs/PET_OPEN_ITEMS_API_CONTRACT.md` §1. Bölüm zarfı hasta özetiyle aynı. */
export interface PetOpenVaccinationDto {
    id?: string | null;
    vaccineName?: string | null;
    dueAtUtc?: string | null;
    clinicId?: string | null;
}

export interface PetOpenVaccinationsDto {
    overdue?: PetOpenVaccinationDto[] | null;
    upcoming?: PetOpenVaccinationDto[] | null;
}

export interface PetOpenLabResultDto {
    id?: string | null;
    testName?: string | null;
    requestedAtUtc?: string | null;
    resultDateUtc?: string | null;
    examinationId?: string | null;
    visitId?: string | null;
    clinicId?: string | null;
}

export interface PetOpenLabResultsDto {
    awaitingResult?: PetOpenLabResultDto[] | null;
    awaitingInterpretation?: PetOpenLabResultDto[] | null;
}

export interface PetPendingChargesSummaryDto {
    count?: number | null;
    totalAmount?: number | null;
    unpricedCount?: number | null;
    currency?: string | null;
}

export interface PetNextAppointmentDto {
    id?: string | null;
    scheduledAtUtc?: string | null;
    durationMinutes?: number | null;
    appointmentType?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
}

export interface PetOutstandingDto {
    petOutstandingAmount?: number | null;
    petOpenChargeCount?: number | null;
    clientOutstandingAmount?: number | null;
    currency?: string | null;
}

export interface PetOpenItemsDto {
    petId?: string | null;
    clientId?: string | null;
    status?: string | null;
    asOfUtc?: string | null;
    vaccinations?: PetSummarySectionDto<PetOpenVaccinationsDto> | null;
    labResults?: PetSummarySectionDto<PetOpenLabResultsDto> | null;
    pendingCharges?: PetSummarySectionDto<PetPendingChargesSummaryDto> | null;
    nextAppointment?: PetSummarySectionDto<PetNextAppointmentDto> | null;
    outstanding?: PetSummarySectionDto<PetOutstandingDto> | null;
}
