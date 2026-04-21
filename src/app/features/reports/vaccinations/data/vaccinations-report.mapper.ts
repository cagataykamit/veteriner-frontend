import { parseVaccinationStatusRawToEnum } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import type { VaccinationsReportDto, VaccinationsReportItemDto } from '@/app/features/reports/vaccinations/models/vaccinations-report-api.model';
import type { VaccinationReportRowVm, VaccinationsReportResultVm } from '@/app/features/reports/vaccinations/models/vaccinations-report.model';

const EM = '—';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

function readDtoString(dto: unknown, keys: string[]): string | null {
    if (!isRecord(dto)) {
        return null;
    }
    for (const k of keys) {
        if (!(k in dto)) {
            continue;
        }
        const v = dto[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function toFiniteNumber(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) {
        return v;
    }
    if (typeof v === 'string' && v.trim()) {
        const n = Number.parseFloat(v.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export function mapVaccinationListItemDtoToReportRow(dto: VaccinationsReportItemDto): VaccinationReportRowVm {
    const id = firstTrimmed(dto.vaccinationId, dto.id, readDtoString(dto, ['vaccinationId', 'VaccinationId', 'id', 'Id'])) ?? '';
    const appliedAtUtc = firstTrimmed(dto.appliedAtUtc, readDtoString(dto, ['appliedAtUtc', 'AppliedAtUtc']));
    const dueAtUtc = firstTrimmed(dto.nextDueAtUtc, dto.dueAtUtc, readDtoString(dto, ['nextDueAtUtc', 'NextDueAtUtc', 'dueAtUtc', 'DueAtUtc']));
    const clinicName = firstTrimmed(dto.clinicName, readDtoString(dto, ['clinicName', 'ClinicName']));
    const effectiveReportDateUtc = firstTrimmed(
        dto.effectiveReportDateUtc,
        readDtoString(dto, ['effectiveReportDateUtc', 'EffectiveReportDateUtc'])
    );
    return {
        id,
        appliedAtUtc,
        dueAtUtc,
        vaccineName: firstTrimmed(dto.vaccineName, readDtoString(dto, ['vaccineName', 'VaccineName'])) ?? EM,
        petId: firstTrimmed(dto.petId, readDtoString(dto, ['petId', 'PetId'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['petName', 'PetName'])) ?? EM,
        clientId: firstTrimmed(dto.clientId, readDtoString(dto, ['clientId', 'ClientId'])),
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['clientName', 'ClientName'])) ?? EM,
        status: parseVaccinationStatusRawToEnum(dto.status),
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['notes', 'Notes'])) ?? EM,
        clinicLabel: clinicName ?? EM,
        effectiveReportDateUtc
    };
}

export function mapVaccinationsReportDtoToVm(raw: VaccinationsReportDto, q: { page: number; pageSize: number }): VaccinationsReportResultVm {
    const items = (raw.items ?? [])
        .map(mapVaccinationListItemDtoToReportRow)
        .filter((x) => x.id.trim().length > 0);
    const totalCount = toFiniteNumber(raw.totalCount) ?? 0;
    const totalPages = q.pageSize > 0 ? Math.max(1, Math.ceil(totalCount / q.pageSize)) : 1;
    return {
        items,
        totalCount,
        page: q.page,
        pageSize: q.pageSize,
        totalPages
    };
}
