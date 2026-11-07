/** Aşı takvimi satırı — `VACCINATION_SCHEDULE_API_CONTRACT.md` §2. Sınırlar ve öneri hesabı backend'dedir. */
export interface VaccinationScheduleItemDto {
    readonly id: string;
    readonly speciesId: string;
    readonly speciesName: string;
    readonly vaccineDefinitionId: string;
    readonly vaccineName: string;
    readonly vaccineIsActive: boolean;
    readonly startAgeWeeks: number;
    readonly doseCount: number;
    readonly doseIntervalWeeks: number | null;
    readonly repeatIntervalMonths: number | null;
    readonly notes: string | null;
    readonly updatedAtUtc: string | null;
}

export interface VaccinationScheduleDto {
    readonly items: readonly VaccinationScheduleItemDto[];
}

export interface VaccinationScheduleTemplateResultDto {
    readonly addedCount: number;
    readonly schedule: VaccinationScheduleDto;
}

/** POST/PUT gövdesi; PUT'ta tür ve aşı yok sayılır. */
export interface VaccinationScheduleItemBody {
    readonly speciesId: string;
    readonly vaccineDefinitionId: string;
    readonly startAgeWeeks: number;
    readonly doseCount: number;
    readonly doseIntervalWeeks: number | null;
    readonly repeatIntervalMonths: number | null;
    readonly notes: string | null;
}

/** Form sınırları backend `VaccinationScheduleItem` ile aynı; red sunucudadır, form yalnız erken uyarır. */
export const VACCINATION_SCHEDULE_LIMITS = {
    maxStartAgeWeeks: 520,
    maxDoseCount: 5,
    maxDoseIntervalWeeks: 52,
    maxRepeatIntervalMonths: 60,
    notesMaxLength: 500
} as const;

export type VaccinationPlanSkipReason = 'AlreadyScheduled' | 'NextDueSet' | 'Completed' | 'VaccineInactive' | 'BeyondHorizon';

/** Öneri — §3. `doseNumber` `null`: tekrar dozu. `dueDate` `yyyy-MM-dd` (İstanbul günü). */
export interface VaccinationPlanSuggestionDto {
    readonly scheduleItemId: string;
    readonly vaccineDefinitionId: string;
    readonly vaccineName: string;
    readonly doseNumber: number | null;
    readonly doseCount: number;
    readonly appliedDoseCount: number;
    readonly dueDate: string;
    readonly isLate: boolean;
}

export interface VaccinationPlanSkippedDto {
    readonly scheduleItemId: string;
    readonly vaccineDefinitionId: string;
    readonly vaccineName: string;
    readonly reason: VaccinationPlanSkipReason;
    readonly dueDate: string | null;
}

export interface VaccinationPlanDto {
    readonly petId: string;
    readonly petName: string;
    readonly speciesId: string;
    readonly speciesName: string | null;
    readonly birthDate: string | null;
    readonly scheduleItemCount: number;
    readonly suggestions: readonly VaccinationPlanSuggestionDto[];
    readonly skipped: readonly VaccinationPlanSkippedDto[];
}

/** Onay — §4. */
export interface VaccinationPlanApplyItem {
    readonly vaccineDefinitionId: string;
    readonly dueDate: string;
    readonly notes: string | null;
}

export interface VaccinationPlanApplyResultDto {
    readonly petId: string;
    readonly created: readonly { readonly vaccinationId: string; readonly vaccineDefinitionId: string; readonly dueDate: string }[];
}

export const VACCINATION_PLAN_SKIP_TEXT: Readonly<Record<VaccinationPlanSkipReason, string>> = {
    AlreadyScheduled: 'Planlı kaydı var',
    NextDueSet: 'Son dozda sonraki uygulama tarihi girilmiş',
    Completed: 'Seri tamamlandı',
    VaccineInactive: 'Aşı tanımı pasif',
    BeyondHorizon: 'Kalan doz 5 yıldan sonra'
};

/** "1. doz / 3" ya da "Tekrar". */
export function vaccinationDoseLabel(doseNumber: number | null, doseCount: number): string {
    return doseNumber === null ? 'Tekrar' : `${doseNumber}. doz / ${doseCount}`;
}

/** Takvim satırının tek cümlelik özeti: "6. haftada başlar · 3 doz, 3 hafta arayla · 12 ayda bir tekrar". */
export function vaccinationScheduleSummary(item: Pick<VaccinationScheduleItemDto, 'startAgeWeeks' | 'doseCount' | 'doseIntervalWeeks' | 'repeatIntervalMonths'>): string {
    const start = item.startAgeWeeks === 0 ? 'Doğumda başlar' : `${item.startAgeWeeks}. haftada başlar`;
    const series = item.doseCount > 1 ? `${item.doseCount} doz, ${item.doseIntervalWeeks} hafta arayla` : 'Tek doz';
    const repeat = item.repeatIntervalMonths ? `${item.repeatIntervalMonths} ayda bir tekrar` : 'Tekrar yok';

    return `${start} · ${series} · ${repeat}`;
}
