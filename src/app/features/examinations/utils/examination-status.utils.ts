import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * TODO(Sprint3): Bu util şu an Examinations ekranlarında kullanılmıyor.
 * Examinations API'de status alanı kesinleştiğinde ya aktif kullanıma alınmalı
 * ya da modülden kaldırılmalı.
 */
const EM = '—';

const LABELS: Record<string, string> = {
    '0': 'Taslak',
    '1': 'Tamamlandı',
    '2': 'İptal',
    draft: 'Taslak',
    pending: 'Bekliyor',
    inprogress: 'Devam ediyor',
    in_progress: 'Devam ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    canceled: 'İptal',
    created: 'Oluşturuldu',
    active: 'Aktif',
    closed: 'Kapandı',
    done: 'Tamamlandı',
    failed: 'Başarısız'
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
    if (k === '0') {
        return 'warn';
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
    if (k === 'draft' || k === 'taslak') {
        return 'warn';
    }
    if (k === 'pending' || k === 'bekliyor') {
        return 'warn';
    }
    if (k === 'inprogress' || k === 'in_progress') {
        return 'info';
    }
    if (k === 'created' || k === 'active' || k === 'closed') {
        return 'info';
    }
    if (k === 'done') {
        return 'success';
    }
    if (k === 'failed') {
        return 'danger';
    }
    return 'secondary';
}
