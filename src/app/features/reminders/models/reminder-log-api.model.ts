export type ReminderTypeApi = 'Appointment' | 'Vaccination' | 0 | 1 | string | number;
export type ReminderStatusApi = 'Pending' | 'Enqueued' | 'Sent' | 'Failed' | 'Skipped' | 0 | 1 | 2 | 3 | 4 | string | number;
export type ReminderSourceEntityTypeApi = 'Appointment' | 'Vaccination' | 0 | 1 | string | number;

export interface ReminderLogItemDto {
    id: string;
    clinicId: string | null;
    reminderType: ReminderTypeApi | null;
    sourceEntityType: ReminderSourceEntityTypeApi | null;
    sourceEntityId: string | null;
    recipientEmail: string | null;
    recipientName: string | null;
    scheduledForUtc: string | null;
    reminderDueAtUtc: string | null;
    status: ReminderStatusApi | null;
    outboxMessageId: string | null;
    sentAtUtc: string | null;
    failedAtUtc: string | null;
    lastError: string | null;
    createdAtUtc: string | null;
}

export interface ReminderLogsPagedDto {
    items: ReminderLogItemDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ReminderLogsQuery {
    page: number;
    pageSize: number;
    reminderType?: string;
    status?: string;
    fromUtc?: string;
    toUtc?: string;
}
