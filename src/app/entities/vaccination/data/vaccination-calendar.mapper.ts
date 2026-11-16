import type {
    VaccinationCalendarItemDto,
    VaccinationCalendarItemVm,
    VaccinationCalendarKind,
    VaccinationCalendarState
} from '@/app/entities/vaccination/models/vaccination-calendar.model';

const KINDS: readonly VaccinationCalendarKind[] = ['Planned', 'NextDue', 'Applied'];
const STATES: readonly VaccinationCalendarState[] = ['Applied', 'DueToday', 'Upcoming', 'Overdue'];

function text(value: string | null | undefined, fallback = '—'): string {
    return value?.trim() ? value.trim() : fallback;
}

function id(value: string | null | undefined): string | null {
    return value?.trim() ? value.trim() : null;
}

/** Bilinmeyen tür/durum ya da tarihi olmayan satır atlanır (`null`). */
export function mapVaccinationCalendarItemDtoToVm(dto: VaccinationCalendarItemDto): VaccinationCalendarItemVm | null {
    const kind = KINDS.find((k) => k === dto.kind);
    const state = STATES.find((s) => s === dto.state);
    const dateKey = dto.date?.trim().slice(0, 10) ?? '';
    const vaccinationId = dto.vaccinationId?.trim() ?? '';

    if (!kind || !state || !vaccinationId || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return null;
    }

    return {
        key: `${vaccinationId}:${kind}`,
        vaccinationId,
        kind,
        state,
        dateKey,
        atUtc: id(dto.atUtc),
        petId: id(dto.petId),
        petName: text(dto.petName),
        clientId: id(dto.clientId),
        clientName: text(dto.clientName),
        vaccineDefinitionId: id(dto.vaccineDefinitionId),
        vaccineName: text(dto.vaccineName, 'Aşı'),
        notes: id(dto.notes)
    };
}

export function mapVaccinationCalendarItemsToVm(items: VaccinationCalendarItemDto[] | null | undefined): VaccinationCalendarItemVm[] {
    return (items ?? []).map(mapVaccinationCalendarItemDtoToVm).filter((x): x is VaccinationCalendarItemVm => x !== null);
}
