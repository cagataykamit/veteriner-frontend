import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const LABELS: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Pasif',
    aktif: 'Aktif',
    pasif: 'Pasif'
};

export function clientStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return '—';
    }
    const k = status.toLowerCase();
    return LABELS[k] ?? status;
}

export function clientStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = status.toLowerCase();
    if (k === 'active' || k === 'aktif') {
        return 'success';
    }
    if (k === 'inactive' || k === 'pasif') {
        return 'warn';
    }
    return 'info';
}
