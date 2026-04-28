import { HttpParams } from '@angular/common/http';
import type {
    ReminderLogItemDto,
    ReminderLogsPagedDto,
    ReminderLogsQuery
} from '@/app/features/reminders/models/reminder-log-api.model';
import type { ReminderSettingsFormValue } from '@/app/features/reminders/forms/reminder-settings-form.model';
import type { ReminderLogsPagedVm, ReminderLogItemVm } from '@/app/features/reminders/models/reminder-log-vm.model';
import type { ReminderSettingsVm } from '@/app/features/reminders/models/reminder-settings-vm.model';
import type {
    ReminderSettingsDto,
    ReminderSettingsUpdateRequestDto as ReminderSettingsUpdateBody
} from '@/app/features/reminders/models/reminder-settings-api.model';

function toTrimmedString(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return String(value).trim();
}

function safeText(value: unknown, fallback = '—'): string {
    const t = toTrimmedString(value);
    return t || fallback;
}

function appendQueryParam(params: HttpParams, key: string, value: unknown): HttpParams {
    if (value === null || value === undefined) {
        return params;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? params.set(key, trimmed) : params;
    }
    if (value instanceof Date) {
        return params.set(key, value.toISOString());
    }
    return params.set(key, String(value));
}

export function reminderLogsQueryToHttpParams(query: ReminderLogsQuery): HttpParams {
    let p = new HttpParams();
    p = appendQueryParam(p, 'page', query.page);
    p = appendQueryParam(p, 'pageSize', query.pageSize);
    p = appendQueryParam(p, 'reminderType', query.reminderType);
    p = appendQueryParam(p, 'status', query.status);
    p = appendQueryParam(p, 'fromUtc', query.fromUtc);
    p = appendQueryParam(p, 'toUtc', query.toUtc);
    return p;
}

export function mapReminderSettingsDtoToVm(dto: ReminderSettingsDto): ReminderSettingsVm {
    return {
        appointmentRemindersEnabled: dto.appointmentRemindersEnabled === true,
        appointmentReminderHoursBefore: Math.min(168, Math.max(1, Number(dto.appointmentReminderHoursBefore) || 24)),
        vaccinationRemindersEnabled: dto.vaccinationRemindersEnabled === true,
        vaccinationReminderDaysBefore: Math.min(30, Math.max(1, Number(dto.vaccinationReminderDaysBefore) || 3)),
        emailChannelEnabled: dto.emailChannelEnabled === true,
        updatedAtUtc: dto.updatedAtUtc?.trim() ? dto.updatedAtUtc.trim() : null
    };
}

export function mapReminderSettingsFormToUpdateRequest(form: ReminderSettingsFormValue): ReminderSettingsUpdateBody {
    return {
        appointmentRemindersEnabled: form.appointmentRemindersEnabled,
        appointmentReminderHoursBefore: Number(form.appointmentReminderHoursBefore ?? 24),
        vaccinationRemindersEnabled: form.vaccinationRemindersEnabled,
        vaccinationReminderDaysBefore: Number(form.vaccinationReminderDaysBefore ?? 3),
        emailChannelEnabled: form.emailChannelEnabled
    };
}

export function mapReminderLogItemDtoToVm(dto: ReminderLogItemDto): ReminderLogItemVm {
    const relatedType = safeText(dto.sourceEntityType, '');
    const relatedId = safeText(dto.sourceEntityId, '');
    return {
        id: dto.id,
        reminderTypeLabel: reminderTypeLabel(dto.reminderType),
        statusLabel: reminderStatusLabel(dto.status),
        statusSeverity: reminderStatusSeverity(dto.status),
        recipientDisplay: recipientDisplay(dto),
        relatedRecordDisplay: relatedType && relatedId ? `${relatedType} #${relatedId}` : '—',
        errorDisplay: safeText(dto.lastError, '—'),
        primaryDateUtc: dto.sentAtUtc ?? dto.failedAtUtc ?? dto.scheduledForUtc ?? dto.reminderDueAtUtc ?? dto.createdAtUtc ?? null
    };
}

export function mapReminderLogsPagedDtoToVm(dto: ReminderLogsPagedDto): ReminderLogsPagedVm {
    return {
        items: (dto.items ?? []).map(mapReminderLogItemDtoToVm),
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
        totalItems: dto.totalItems ?? 0,
        totalPages: dto.totalPages ?? 0
    };
}

function reminderTypeLabel(type: string | null): string {
    const t = toTrimmedString(type).toLowerCase();
    if (t === 'appointment') {
        return 'Randevu';
    }
    if (t === 'vaccination') {
        return 'Aşı';
    }
    return safeText(type);
}

function reminderStatusLabel(status: string | null): string {
    const s = toTrimmedString(status).toLowerCase();
    if (s === 'pending') {
        return 'Bekliyor';
    }
    if (s === 'enqueued') {
        return 'Kuyruğa alındı';
    }
    if (s === 'sent') {
        return 'Gönderildi';
    }
    if (s === 'failed') {
        return 'Başarısız';
    }
    if (s === 'skipped') {
        return 'Atlandı';
    }
    return safeText(status);
}

function reminderStatusSeverity(status: string | null): ReminderLogItemVm['statusSeverity'] {
    const s = toTrimmedString(status).toLowerCase();
    if (s === 'sent') {
        return 'success';
    }
    if (s === 'failed') {
        return 'danger';
    }
    if (s === 'enqueued') {
        return 'warn';
    }
    if (s === 'pending') {
        return 'info';
    }
    if (s === 'skipped') {
        return 'secondary';
    }
    return 'secondary';
}

function recipientDisplay(dto: ReminderLogItemDto): string {
    const name = toTrimmedString(dto.recipientName);
    const email = toTrimmedString(dto.recipientEmail);
    if (name && email) {
        return `${name} (${email})`;
    }
    return safeText(name ?? email);
}
