import type { ExaminationListItemDto } from '@/app/features/examinations/models/examination-api.model';
import { mapExaminationListItemDtoToVm } from '@/app/features/examinations/data/examination.mapper';
import type { ExaminationsReportDto } from '@/app/features/reports/examinations/models/examinations-report-api.model';
import type { ExaminationReportRowVm, ExaminationsReportResultVm } from '@/app/features/reports/examinations/models/examinations-report.model';

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

export function mapExaminationListItemDtoToReportRow(dto: ExaminationListItemDto): ExaminationReportRowVm {
    const vm = mapExaminationListItemDtoToVm(dto);
    const clinicName = firstTrimmed(dto.clinicName, readDtoString(dto, ['ClinicName']));
    const findings = firstTrimmed(dto.findings, dto.finding, readDtoString(dto, ['Findings', 'Finding'])) ?? EM;
    const assessment = firstTrimmed(dto.assessment, dto.diagnosis, readDtoString(dto, ['Assessment', 'Diagnosis'])) ?? EM;
    const notes = firstTrimmed(dto.notes, dto.note, readDtoString(dto, ['Notes', 'Note'])) ?? EM;
    return {
        ...vm,
        clinicLabel: clinicName ?? EM,
        appointmentLinked: !!vm.appointmentId,
        findings,
        assessment,
        notes
    };
}

export function mapExaminationsReportDtoToVm(raw: ExaminationsReportDto, q: { page: number; pageSize: number }): ExaminationsReportResultVm {
    const items = (raw.items ?? []).map(mapExaminationListItemDtoToReportRow);
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
