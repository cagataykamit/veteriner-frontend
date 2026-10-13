import type { LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export const LAB_RESULT_AWAITING_INTERPRETATION_LABEL = 'Değerlendirme bekliyor';

const LABELS: Record<LabResultStatus, string> = {
    Requested: 'İstendi',
    Resulted: 'Sonuçlandı',
    Cancelled: 'İptal'
};

const SEVERITIES: Record<LabResultStatus, StatusTagSeverity> = {
    Requested: 'info',
    Resulted: 'success',
    Cancelled: 'danger'
};

export function parseLabResultStatus(raw: string | null | undefined): LabResultStatus | null {
    const t = raw?.trim();
    return t && t in LABELS ? (t as LabResultStatus) : null;
}

export function labResultStatusLabel(status: LabResultStatus): string {
    return LABELS[status];
}

export function labResultStatusSeverity(status: LabResultStatus): StatusTagSeverity {
    return SEVERITIES[status];
}

/** Süzgeç seçenekleri; "Aktif" backend'in varsayılanıdır (iptaller gizli, `status` gönderilmez). */
export const LAB_RESULT_STATUS_FILTER_OPTIONS: Array<{ label: string; value: LabResultStatus | '' }> = [
    { label: 'İptaller hariç', value: '' },
    { label: LABELS.Requested, value: 'Requested' },
    { label: LABELS.Resulted, value: 'Resulted' },
    { label: LABELS.Cancelled, value: 'Cancelled' }
];

/** İptal edilen kayıt düzenlenemez; Requested ve Resulted düzenlenir (ADR-013: kesinleşmiş muayenede de). */
export function isLabResultEditable(status: LabResultStatus | null): boolean {
    return status !== 'Cancelled';
}

export function labResultEditLabel(status: LabResultStatus | null): string {
    return status === 'Requested' ? 'Sonuç gir' : 'Düzenle';
}
