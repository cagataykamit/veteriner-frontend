import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

const LABELS: Record<string, string> = {
    draft: 'Taslak',
    pending: 'Bekliyor',
    inprogress: 'Devam ediyor',
    in_progress: 'Devam ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    canceled: 'İptal'
};

export function examinationStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const k = status.toLowerCase().replace(/\s+/g, '');
    const normalized = k.replace(/-/g, '_');
    return LABELS[k] ?? LABELS[normalized] ?? status;
}

export function examinationStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = status.toLowerCase().replace(/\s+/g, '');
    if (k === 'completed' || k === 'tamamlandı') {
        return 'success';
    }
    if (k === 'cancelled' || k === 'canceled' || k === 'iptal') {
        return 'danger';
    }
    if (k === 'draft' || k === 'taslak') {
        return 'warn';
    }
    if (k === 'pending' || k === 'bekliyor') {
        return 'warn';
    }
    if (k === 'inprogress' || k === 'in_progress') {
        return 'info';
    }
    return 'secondary';
}
