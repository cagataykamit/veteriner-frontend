import type {
    PetSummaryAppliedVaccinationDto,
    PetSummaryDto,
    PetSummaryDueVaccinationDto,
    PetSummaryExaminationDto,
    PetSummaryHospitalizationDto,
    PetSummarySectionDto,
    PetSummaryVaccinationsDto,
    PetSummaryVisitDto,
    PetSummaryWeightDto
} from '@/app/entities/pet/models/pet-summary-api.model';
import type {
    PetSummaryAppliedVaccinationVm,
    PetSummaryDueVaccinationVm,
    PetSummaryExaminationVm,
    PetSummaryHospitalizationVm,
    PetSummarySectionState,
    PetSummarySectionVm,
    PetSummaryVaccinationsVm,
    PetSummaryVisitVm,
    PetSummaryVm,
    PetSummaryWeightVm
} from '@/app/entities/pet/models/pet-summary-vm.model';
import { mapPetAlertsDtoToVm } from '@/app/shared/pet-alerts/pet-alerts.utils';

export function trimOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();

    return t ? t : null;
}

export function finiteOrNull(v: number | null | undefined): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const NON_OK_STATES: ReadonlySet<string> = new Set<PetSummarySectionState>(['Empty', 'Forbidden', 'Unavailable']);

/**
 * Bölüm zarfı → VM (hasta özeti ve açık işler ortak). Bilinmeyen/eksik `state` ve okunamayan `Ok` verisi `Unavailable` sayılır:
 * eksik veri asla "kayıt yok" gibi gösterilmez.
 */
export function mapSection<TDto, TVm>(
    section: PetSummarySectionDto<TDto> | null | undefined,
    mapData: (dto: TDto) => TVm | null
): PetSummarySectionVm<TVm> {
    const state = section?.state ?? '';

    if (NON_OK_STATES.has(state)) {
        return { state: state as PetSummarySectionState, data: null };
    }

    if (state === 'Ok' && section?.data) {
        const data = mapData(section.data);

        if (data) {
            return { state: 'Ok', data };
        }
    }

    return { state: 'Unavailable', data: null };
}

function mapHospitalization(dto: PetSummaryHospitalizationDto): PetSummaryHospitalizationVm | null {
    const id = trimOrNull(dto.id);

    return id
        ? {
              id,
              clinicName: trimOrNull(dto.clinicName),
              admittedAtUtc: trimOrNull(dto.admittedAtUtc),
              plannedDischargeAtUtc: trimOrNull(dto.plannedDischargeAtUtc),
              reason: trimOrNull(dto.reason),
              examinationId: trimOrNull(dto.examinationId)
          }
        : null;
}

function mapApplied(dto: PetSummaryAppliedVaccinationDto | null | undefined): PetSummaryAppliedVaccinationVm | null {
    const id = trimOrNull(dto?.id);

    return id ? { id, vaccineName: trimOrNull(dto?.vaccineName) ?? '—', appliedAtUtc: trimOrNull(dto?.appliedAtUtc) } : null;
}

function mapDue(dto: PetSummaryDueVaccinationDto | null | undefined): PetSummaryDueVaccinationVm | null {
    const id = trimOrNull(dto?.id);

    return id
        ? { id, vaccineName: trimOrNull(dto?.vaccineName) ?? '—', dueAtUtc: trimOrNull(dto?.dueAtUtc), isOverdue: dto?.isOverdue === true }
        : null;
}

function mapVaccinations(dto: PetSummaryVaccinationsDto): PetSummaryVaccinationsVm | null {
    const lastApplied = mapApplied(dto.lastApplied);
    const nextDue = mapDue(dto.nextDue);

    return lastApplied || nextDue ? { lastApplied, nextDue } : null;
}

function mapWeight(dto: PetSummaryWeightDto): PetSummaryWeightVm | null {
    const weightKg = finiteOrNull(dto.weightKg);

    return weightKg === null ? null : { weightKg, measuredAtUtc: trimOrNull(dto.measuredAtUtc), examinationId: trimOrNull(dto.examinationId) };
}

function mapVisit(dto: PetSummaryVisitDto): PetSummaryVisitVm | null {
    const id = trimOrNull(dto.id);

    return id
        ? { id, arrivedAtUtc: trimOrNull(dto.arrivedAtUtc), careStatus: trimOrNull(dto.careStatus), clinicName: trimOrNull(dto.clinicName) }
        : null;
}

function mapExamination(dto: PetSummaryExaminationDto): PetSummaryExaminationVm | null {
    const id = trimOrNull(dto.id);

    return id
        ? { id, examinedAtUtc: trimOrNull(dto.examinedAtUtc), visitReason: trimOrNull(dto.visitReason), clinicName: trimOrNull(dto.clinicName) }
        : null;
}

/** GET /pets/{id}/summary → VM. */
export function mapPetSummaryDtoToVm(dto: PetSummaryDto): PetSummaryVm {
    return {
        petId: trimOrNull(dto.petId) ?? '',
        petAlerts: mapPetAlertsDtoToVm(dto.petAlerts),
        profileWeightKg: finiteOrNull(dto.profileWeightKg),
        activeHospitalization: mapSection(dto.activeHospitalization, mapHospitalization),
        vaccinations: mapSection(dto.vaccinations, mapVaccinations),
        latestWeight: mapSection(dto.latestWeight, mapWeight),
        lastVisit: mapSection(dto.lastVisit, mapVisit),
        lastExamination: mapSection(dto.lastExamination, mapExamination)
    };
}
