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
    const sourceEntityTypeLabel = sourceEntityTypeLabelForDisplay(dto.sourceEntityType, dto.reminderType);
    const sourceEntityId = toTrimmedString(dto.sourceEntityId) || null;
    const relatedRecord = relatedRecordMeta(dto.sourceEntityType, dto.reminderType, sourceEntityId);
    return {
        id: dto.id,
        reminderTypeLabel: reminderTypeLabel(dto.reminderType),
        sourceEntityTypeLabel,
        sourceEntityId,
        statusLabel: reminderStatusLabel(dto.status),
        statusSeverity: reminderStatusSeverity(dto.status),
        recipientDisplay: recipientDisplay(dto),
        relatedRecordLabel: relatedRecord.label,
        relatedRecordRoute: relatedRecord.route,
        errorDisplay: mapErrorDisplay(dto.lastError),
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

function reminderTypeLabel(type: unknown): string {
    const normalized = normalizeReminderType(type);
    if (normalized === 0) {
        return 'Randevu';
    }
    if (normalized === 1) {
        return 'Aşı';
    }
    return safeText(type);
}

function reminderStatusLabel(status: unknown): string {
    const normalized = normalizeReminderStatus(status);
    if (normalized === 0) {
        return 'Bekliyor';
    }
    if (normalized === 1) {
        return 'Kuyruğa alındı';
    }
    if (normalized === 2) {
        return 'Gönderildi';
    }
    if (normalized === 3) {
        return 'Başarısız';
    }
    if (normalized === 4) {
        return 'Atlandı';
    }
    return safeText(status);
}

function reminderStatusSeverity(status: unknown): ReminderLogItemVm['statusSeverity'] {
    const normalized = normalizeReminderStatus(status);
    if (normalized === 2) {
        return 'success';
    }
    if (normalized === 3) {
        return 'danger';
    }
    if (normalized === 1) {
        return 'info';
    }
    if (normalized === 0) {
        return 'secondary';
    }
    if (normalized === 4) {
        return 'warn';
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

function sourceEntityTypeLabelForDisplay(sourceEntityType: unknown, fallbackReminderType: unknown): string {
    const normalizedSourceEntityType = normalizeReminderType(sourceEntityType);
    if (normalizedSourceEntityType === 0) {
        return 'Randevu';
    }
    if (normalizedSourceEntityType === 1) {
        return 'Aşı';
    }
    const normalizedReminderType = normalizeReminderType(fallbackReminderType);
    if (normalizedReminderType === 0) {
        return 'Randevu';
    }
    if (normalizedReminderType === 1) {
        return 'Aşı';
    }
    return safeText(sourceEntityType, '');
}

function relatedRecordMeta(
    sourceEntityType: unknown,
    fallbackReminderType: unknown,
    sourceEntityId: string | null
): { label: string; route: string[] | null } {
    const normalizedType = normalizeReminderType(sourceEntityType) ?? normalizeReminderType(fallbackReminderType);
    if (normalizedType === 0) {
        if (sourceEntityId) {
            return {
                label: 'Randevuyu görüntüle',
                route: ['/panel/appointments', sourceEntityId]
            };
        }
        return { label: 'Randevu', route: null };
    }
    if (normalizedType === 1) {
        return { label: 'Aşı', route: null };
    }
    return { label: 'İlgili kayıt', route: null };
}

function mapErrorDisplay(lastError: unknown): string {
    const text = toTrimmedString(lastError);
    if (!text) {
        return '—';
    }
    if (isLegacyUnverifiedDispatchError(text)) {
        return 'Gönderim doğrulanamadı';
    }
    return text;
}

function isLegacyUnverifiedDispatchError(value: string): boolean {
    return value.toLowerCase() === 'gonderim sonucu dogrulanamadi. lutfen gerekirse yeniden hatirlatma olusturun.'
        || value.toLowerCase() === 'gönderim sonucu doğrulanamadı. lütfen gerekirse yeniden hatırlatma oluşturun.';
}

function normalizeReminderType(value: unknown): 0 | 1 | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value === 0 || value === 1) {
            return value;
        }
        return null;
    }
    const raw = toTrimmedString(value).toLowerCase();
    if (!raw) {
        return null;
    }
    if (raw === '0' || raw === 'appointment') {
        return 0;
    }
    if (raw === '1' || raw === 'vaccination') {
        return 1;
    }
    return null;
}

function normalizeReminderStatus(value: unknown): 0 | 1 | 2 | 3 | 4 | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value >= 0 && value <= 4) {
            return value as 0 | 1 | 2 | 3 | 4;
        }
        return null;
    }
    const raw = toTrimmedString(value).toLowerCase();
    if (!raw) {
        return null;
    }
    if (raw === '0' || raw === 'pending') {
        return 0;
    }
    if (raw === '1' || raw === 'enqueued') {
        return 1;
    }
    if (raw === '2' || raw === 'sent') {
        return 2;
    }
    if (raw === '3' || raw === 'failed') {
        return 3;
    }
    if (raw === '4' || raw === 'skipped') {
        return 4;
    }
    return null;
}
