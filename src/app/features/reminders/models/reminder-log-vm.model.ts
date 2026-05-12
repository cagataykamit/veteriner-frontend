import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface ReminderLogItemVm {
    id: string;
    clinicId: string | null;
    /** Gösterim: API `clinicName` veya klinik listesi eşlemesi; yoksa "—". */
    clinicDisplay: string;
    reminderTypeLabel: string;
    sourceEntityTypeLabel: string;
    sourceEntityId: string | null;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
    recipientDisplay: string;
    relatedRecordLabel: string;
    relatedRecordRoute: string[] | null;
    errorDisplay: string;
    primaryDateUtc: string | null;
}

export interface ReminderLogsPagedVm {
    items: ReminderLogItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
