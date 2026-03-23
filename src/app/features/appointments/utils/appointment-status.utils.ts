import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

const LABELS: Record<string, string> = {
    '0': 'Planlandı',
    '1': 'Tamamlandı',
    '2': 'İptal',
    scheduled: 'Planlandı',
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    canceled: 'İptal',
    noshow: 'Gelmedi',
    'no-show': 'Gelmedi',
    no_show: 'Gelmedi',
    inprogress: 'Devam ediyor',
    in_progress: 'Devam ediyor',
    created: 'Oluşturuldu',
    active: 'Aktif',
    closed: 'Kapandı',
    done: 'Tamamlandı',
    completedsuccessfully: 'Tamamlandı',
    failed: 'Başarısız'
};

export function appointmentStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const k = status.toLowerCase().replace(/\s+/g, '');
    const normalized = k.replace(/-/g, '_');
    return LABELS[k] ?? LABELS[normalized] ?? status;
}

export function appointmentStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = status.toLowerCase().replace(/\s+/g, '');
    if (k === '0') {
        return 'info';
    }
    if (k === '1') {
        return 'success';
    }
    if (k === '2') {
        return 'danger';
    }
    if (k === 'completed' || k === 'tamamlandı') {
        return 'success';
    }
    if (k === 'cancelled' || k === 'canceled' || k === 'iptal') {
        return 'danger';
    }
    if (k === 'noshow' || k === 'no-show' || k === 'no_show' || k === 'gelmedi') {
        return 'warn';
    }
    if (k === 'pending' || k === 'bekliyor') {
        return 'warn';
    }
    if (k === 'confirmed' || k === 'onaylandı') {
        return 'info';
    }
    if (k === 'scheduled' || k === 'planlandı') {
        return 'info';
    }
    if (k === 'inprogress' || k === 'in_progress') {
        return 'info';
    }
    if (k === 'created' || k === 'active' || k === 'closed') {
        return 'info';
    }
    if (k === 'done' || k === 'completedsuccessfully') {
        return 'success';
    }
    if (k === 'failed') {
        return 'danger';
    }
    return 'secondary';
}
