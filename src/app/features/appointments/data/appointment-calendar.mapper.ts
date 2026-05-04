import { HttpParams } from '@angular/common/http';
import {
    formatAppointmentDurationLabel,
    normalizeAppointmentDurationMinutesFromApi,
    resolveAppointmentScheduledEndUtc
} from '@/app/features/appointments/data/appointment.mapper';
import type {
    AppointmentCalendarItemDto,
    AppointmentCalendarQuery
} from '@/app/features/appointments/models/appointment-calendar-api.model';
import type {
    AppointmentCalendarDayGroupVm,
    AppointmentCalendarItemVm
} from '@/app/features/appointments/models/appointment-calendar-vm.model';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import { appointmentTypeLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay, parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

const EM = '—';

function toText(value: string | null | undefined): string {
    return value?.trim() ? value.trim() : EM;
}

function toDateKey(value: string | null): string {
    const d = parseUtcApiInstantIsoString(value);
    if (!d) {
        return 'invalid';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function appointmentCalendarQueryToHttpParams(query: AppointmentCalendarQuery): HttpParams {
    let p = new HttpParams();
    p = p.set('dateFromUtc', query.dateFromUtc);
    p = p.set('dateToUtc', query.dateToUtc);
    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }
    if (query.status?.trim()) {
        p = p.set('status', query.status.trim());
    }
    return p;
}

export function mapAppointmentCalendarItemDtoToVm(dto: AppointmentCalendarItemDto): AppointmentCalendarItemVm {
    const scheduled = dto.scheduledAtUtc?.trim() ? dto.scheduledAtUtc.trim() : null;
    const raw = dto as unknown as Record<string, unknown>;
    const durationMinutes = normalizeAppointmentDurationMinutesFromApi(raw['durationMinutes'] ?? raw['DurationMinutes']);
    const explicitEnd =
        typeof raw['scheduledEndUtc'] === 'string' && raw['scheduledEndUtc'].trim()
            ? raw['scheduledEndUtc'].trim()
            : typeof raw['ScheduledEndUtc'] === 'string' && (raw['ScheduledEndUtc'] as string).trim()
              ? (raw['ScheduledEndUtc'] as string).trim()
              : null;
    const scheduledEndUtc = resolveAppointmentScheduledEndUtc(scheduled, explicitEnd, durationMinutes);
    const startLabel = formatUtcIsoAsLocalTimeDisplay(scheduled);
    const endLabel = formatUtcIsoAsLocalTimeDisplay(scheduledEndUtc);
    const timeRangeLabel =
        scheduledEndUtc && endLabel && startLabel && endLabel !== startLabel ? `${startLabel}–${endLabel}` : startLabel;
    return {
        id: dto.id?.trim() ?? '',
        clinicId: dto.clinicId?.trim() ? dto.clinicId.trim() : null,
        petId: dto.petId?.trim() ? dto.petId.trim() : null,
        clientId: dto.clientId?.trim() ? dto.clientId.trim() : null,
        scheduledAtUtc: scheduled,
        scheduledEndUtc,
        durationMinutes,
        durationLabel: formatAppointmentDurationLabel(durationMinutes),
        localDateLabel: formatUtcIsoAsLocalDateDisplay(scheduled),
        timeLabel: formatUtcIsoAsLocalTimeDisplay(scheduled),
        timeRangeLabel,
        status: dto.status ?? null,
        statusLabel: appointmentStatusLabel(dto.status ?? null),
        statusSeverity: appointmentStatusSeverity(dto.status ?? null),
        appointmentTypeLabel: appointmentTypeLabel(dto.appointmentType ?? null),
        petName: toText(dto.petName),
        clientName: toText(dto.clientName)
    };
}

export function mapAppointmentCalendarItemsToVm(items: AppointmentCalendarItemDto[] | null | undefined): AppointmentCalendarItemVm[] {
    return (items ?? [])
        .map(mapAppointmentCalendarItemDtoToVm)
        .filter((x) => !!x.id)
        .sort((a, b) => {
            const ta = parseUtcApiInstantIsoString(a.scheduledAtUtc)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            const tb = parseUtcApiInstantIsoString(b.scheduledAtUtc)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            return ta - tb;
        });
}

export function groupCalendarItemsByDay(items: readonly AppointmentCalendarItemVm[]): AppointmentCalendarDayGroupVm[] {
    const map = new Map<string, AppointmentCalendarItemVm[]>();
    for (const item of items) {
        const key = toDateKey(item.scheduledAtUtc);
        const bucket = map.get(key) ?? [];
        bucket.push(item);
        map.set(key, bucket);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, dayItems]) => ({
            dateKey,
            dateLabel: formatUtcIsoAsLocalDateDisplay(dayItems[0]?.scheduledAtUtc ?? null),
            items: dayItems
        }));
}
