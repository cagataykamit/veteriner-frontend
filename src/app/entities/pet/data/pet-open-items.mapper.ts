import { finiteOrNull, mapSection, trimOrNull } from '@/app/entities/pet/data/pet-summary.mapper';
import type {
    PetNextAppointmentDto,
    PetOpenItemsDto,
    PetOpenLabResultDto,
    PetOpenLabResultsDto,
    PetOpenVaccinationDto,
    PetOpenVaccinationsDto,
    PetOutstandingDto,
    PetPendingChargesSummaryDto
} from '@/app/entities/pet/models/pet-open-items-api.model';
import type {
    PetNextAppointmentVm,
    PetOpenItemsVm,
    PetOpenLabResultsVm,
    PetOpenLabResultVm,
    PetOpenVaccinationsVm,
    PetOpenVaccinationVm,
    PetOutstandingVm,
    PetPendingChargesSummaryVm
} from '@/app/entities/pet/models/pet-open-items-vm.model';

/** Kimliksiz satır atlanır (eylem bağlantısı kurulamaz). */
function mapRows<TDto extends { id?: string | null }, TVm>(rows: TDto[] | null | undefined, map: (id: string, dto: TDto) => TVm): TVm[] {
    return (rows ?? []).flatMap((r) => {
        const id = trimOrNull(r?.id);

        return id ? [map(id, r)] : [];
    });
}

function mapVaccination(id: string, dto: PetOpenVaccinationDto): PetOpenVaccinationVm {
    return { id, vaccineName: trimOrNull(dto.vaccineName) ?? '—', dueAtUtc: trimOrNull(dto.dueAtUtc) };
}

function mapVaccinations(dto: PetOpenVaccinationsDto): PetOpenVaccinationsVm {
    return { overdue: mapRows(dto.overdue, mapVaccination), upcoming: mapRows(dto.upcoming, mapVaccination) };
}

function mapLab(id: string, dto: PetOpenLabResultDto): PetOpenLabResultVm {
    return { id, testName: trimOrNull(dto.testName) ?? '—', requestedAtUtc: trimOrNull(dto.requestedAtUtc), resultDateUtc: trimOrNull(dto.resultDateUtc) };
}

function mapLabResults(dto: PetOpenLabResultsDto): PetOpenLabResultsVm {
    return { awaitingResult: mapRows(dto.awaitingResult, mapLab), awaitingInterpretation: mapRows(dto.awaitingInterpretation, mapLab) };
}

function mapPendingCharges(dto: PetPendingChargesSummaryDto): PetPendingChargesSummaryVm | null {
    const count = finiteOrNull(dto.count);

    return count === null
        ? null
        : { count, totalAmount: finiteOrNull(dto.totalAmount) ?? 0, unpricedCount: finiteOrNull(dto.unpricedCount) ?? 0, currency: trimOrNull(dto.currency) ?? 'TRY' };
}

function mapNextAppointment(dto: PetNextAppointmentDto): PetNextAppointmentVm | null {
    const id = trimOrNull(dto.id);

    return id
        ? {
              id,
              scheduledAtUtc: trimOrNull(dto.scheduledAtUtc),
              durationMinutes: finiteOrNull(dto.durationMinutes),
              appointmentType: trimOrNull(dto.appointmentType),
              clinicName: trimOrNull(dto.clinicName)
          }
        : null;
}

function mapOutstanding(dto: PetOutstandingDto): PetOutstandingVm | null {
    const clientOutstandingAmount = finiteOrNull(dto.clientOutstandingAmount);

    return clientOutstandingAmount === null
        ? null
        : {
              petOutstandingAmount: finiteOrNull(dto.petOutstandingAmount) ?? 0,
              petOpenChargeCount: finiteOrNull(dto.petOpenChargeCount) ?? 0,
              clientOutstandingAmount,
              currency: trimOrNull(dto.currency) ?? 'TRY'
          };
}

/** GET /pets/{id}/open-items → VM. Bölüm kuralları (aşı penceresi, yorum bekleme, tutar) sunucudadır; burada yalnız şekil çevrilir. */
export function mapPetOpenItemsDtoToVm(dto: PetOpenItemsDto): PetOpenItemsVm {
    return {
        petId: trimOrNull(dto.petId) ?? '',
        clientId: trimOrNull(dto.clientId),
        status: trimOrNull(dto.status),
        asOfUtc: trimOrNull(dto.asOfUtc),
        vaccinations: mapSection(dto.vaccinations, mapVaccinations),
        labResults: mapSection(dto.labResults, mapLabResults),
        pendingCharges: mapSection(dto.pendingCharges, mapPendingCharges),
        nextAppointment: mapSection(dto.nextAppointment, mapNextAppointment),
        outstanding: mapSection(dto.outstanding, mapOutstanding)
    };
}
