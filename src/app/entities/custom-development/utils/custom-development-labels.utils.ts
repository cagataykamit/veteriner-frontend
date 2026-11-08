import type {
    CustomDevelopmentPriority,
    CustomDevelopmentRequestStatus,
    CustomDevelopmentTargetKind
} from '@/app/entities/custom-development/models/custom-development-request.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export const CUSTOM_DEVELOPMENT_STATUS_LABELS: Readonly<Record<CustomDevelopmentRequestStatus, string>> = {
    Received: 'Alındı',
    InReview: 'İnceleniyor',
    Planned: 'Planlandı',
    OutOfScope: 'Kapsam dışı',
    Completed: 'Tamamlandı'
};

export const CUSTOM_DEVELOPMENT_STATUS_SEVERITIES: Readonly<Record<CustomDevelopmentRequestStatus, StatusTagSeverity>> = {
    Received: 'secondary',
    InReview: 'info',
    Planned: 'warn',
    OutOfScope: 'danger',
    Completed: 'success'
};

export const CUSTOM_DEVELOPMENT_TARGET_LABELS: Readonly<Record<CustomDevelopmentTargetKind, string>> = {
    Screen: 'Ekran',
    Report: 'Rapor',
    Output: 'Çıktı'
};

export const CUSTOM_DEVELOPMENT_PRIORITY_LABELS: Readonly<Record<CustomDevelopmentPriority, string>> = {
    Low: 'Düşük',
    Normal: 'Normal',
    High: 'Yüksek'
};

/** Sunucu yeni bir değer eklerse kodun kendisi görünür. */
export function customDevelopmentStatusLabel(status: string): string {
    return CUSTOM_DEVELOPMENT_STATUS_LABELS[status as CustomDevelopmentRequestStatus] ?? status;
}

export function customDevelopmentStatusSeverity(status: string): StatusTagSeverity {
    return CUSTOM_DEVELOPMENT_STATUS_SEVERITIES[status as CustomDevelopmentRequestStatus] ?? 'secondary';
}

export function customDevelopmentTargetLabel(kind: string): string {
    return CUSTOM_DEVELOPMENT_TARGET_LABELS[kind as CustomDevelopmentTargetKind] ?? kind;
}

export function customDevelopmentPriorityLabel(priority: string): string {
    return CUSTOM_DEVELOPMENT_PRIORITY_LABELS[priority as CustomDevelopmentPriority] ?? priority;
}
