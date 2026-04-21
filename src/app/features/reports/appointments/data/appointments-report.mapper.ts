import type { AppointmentListItemDto } from '@/app/features/appointments/models/appointment-api.model';
import { mapAppointmentListItemDtoToVm } from '@/app/features/appointments/data/appointment.mapper';
import type { AppointmentsReportDto } from '@/app/features/reports/appointments/models/appointments-report-api.model';
import type { AppointmentReportRowVm, AppointmentsReportResultVm } from '@/app/features/reports/appointments/models/appointments-report.model';

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

export function mapAppointmentListItemDtoToReportRow(dto: AppointmentListItemDto): AppointmentReportRowVm {
    const vm = mapAppointmentListItemDtoToVm(dto);
    const clinicName = firstTrimmed(dto.clinicName, readDtoString(dto, ['ClinicName']));
    const clinicLabel = clinicName ?? EM;
    const notesRaw = firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note']));
    const notes = notesRaw ?? EM;
    return { ...vm, clinicLabel, notes };
}

export function mapAppointmentsReportDtoToVm(raw: AppointmentsReportDto, q: { page: number; pageSize: number }): AppointmentsReportResultVm {
    const items = (raw.items ?? []).map(mapAppointmentListItemDtoToReportRow);
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
