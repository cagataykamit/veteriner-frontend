import type { VaccinationListItemDto } from '@/app/features/vaccinations/models/vaccination-api.model';
import { mapVaccinationListItemDtoToVm } from '@/app/features/vaccinations/data/vaccination.mapper';
import type { VaccinationsReportDto } from '@/app/features/reports/vaccinations/models/vaccinations-report-api.model';
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

export function mapVaccinationListItemDtoToReportRow(dto: VaccinationListItemDto): VaccinationReportRowVm {
    const vm = mapVaccinationListItemDtoToVm(dto);
    const clinicName = firstTrimmed(
        readDtoString(dto, ['clinicName', 'ClinicName'])
    );
    const vaccinationDateUtc = vm.appliedAtUtc ?? vm.dueAtUtc ?? null;
    return {
        ...vm,
        clinicLabel: clinicName ?? EM,
        vaccinationDateUtc
    };
}

export function mapVaccinationsReportDtoToVm(raw: VaccinationsReportDto, q: { page: number; pageSize: number }): VaccinationsReportResultVm {
    const items = (raw.items ?? []).map(mapVaccinationListItemDtoToReportRow);
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
