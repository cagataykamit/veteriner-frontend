/** GET /pets/{id}/summary — `docs/PET_TIMELINE_API_CONTRACT.md` §1. */
export interface PetSummarySectionDto<T> {
    state?: string | null;
    data?: T | null;
}

export interface PetSummaryHospitalizationDto {
    id?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    admittedAtUtc?: string | null;
    plannedDischargeAtUtc?: string | null;
    reason?: string | null;
    examinationId?: string | null;
}

export interface PetSummaryAppliedVaccinationDto {
    id?: string | null;
    vaccineName?: string | null;
    appliedAtUtc?: string | null;
    clinicId?: string | null;
}

export interface PetSummaryDueVaccinationDto {
    id?: string | null;
    vaccineName?: string | null;
    dueAtUtc?: string | null;
    isOverdue?: boolean | null;
    clinicId?: string | null;
}

export interface PetSummaryVaccinationsDto {
    lastApplied?: PetSummaryAppliedVaccinationDto | null;
    nextDue?: PetSummaryDueVaccinationDto | null;
}

export interface PetSummaryWeightDto {
    weightKg?: number | null;
    measuredAtUtc?: string | null;
    source?: string | null;
    examinationId?: string | null;
}

export interface PetSummaryVisitDto {
    id?: string | null;
    arrivedAtUtc?: string | null;
    careStatus?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
}

export interface PetSummaryExaminationDto {
    id?: string | null;
    examinedAtUtc?: string | null;
    visitReason?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
}

export interface PetSummaryDto {
    petId?: string | null;
    petAlerts?: { flags?: string[] | null; note?: string | null } | null;
    profileWeightKg?: number | null;
    activeHospitalization?: PetSummarySectionDto<PetSummaryHospitalizationDto> | null;
    vaccinations?: PetSummarySectionDto<PetSummaryVaccinationsDto> | null;
    latestWeight?: PetSummarySectionDto<PetSummaryWeightDto> | null;
    lastVisit?: PetSummarySectionDto<PetSummaryVisitDto> | null;
    lastExamination?: PetSummarySectionDto<PetSummaryExaminationDto> | null;
}
