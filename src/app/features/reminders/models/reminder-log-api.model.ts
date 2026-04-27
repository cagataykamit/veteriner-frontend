export type ReminderTypeApi = 'Appointment' | 'Vaccination' | string;
export type ReminderStatusApi = 'Pending' | 'Enqueued' | 'Sent' | 'Failed' | 'Skipped' | string;

export interface ReminderLogItemDto {
    id: string;
    clinicId: string | null;
    reminderType: ReminderTypeApi | null;
    sourceEntityType: string | null;
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
