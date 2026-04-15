import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

// TODO(Sprint3): Payments list/detail DTO'sunda status alanı backend'de stabilize olduğunda bu util UI'a bağlanmalı.
const EM = '—';

export function normalizePaymentStatusKey(status: string): string {
    return normalizeFilterKey(status);
}

const LABELS: Record<string, string> = {
    '0': 'Bekliyor',
    '1': 'Ödendi',
    '2': 'İptal',
    paid: 'Ödendi',
    completed: 'Tamamlandı',
    settled: 'Mahsup',
    pending: 'Bekliyor',
    scheduled: 'Planlandı',
    partial: 'Kısmi',
    overdue: 'Vadesi geçmiş',
    failed: 'Başarısız',
    cancelled: 'İptal',
    canceled: 'İptal',
    refunded: 'İade',
    draft: 'Taslak',
    unknown: 'Bilinmiyor',
    created: 'Oluşturuldu',
    active: 'Aktif',
    closed: 'Kapandı',
    done: 'Tamamlandı'
};

export function paymentStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const k = normalizePaymentStatusKey(status);
    return LABELS[k] ?? status;
}

/**
 * paid/completed/settled → success;
 * pending/scheduled/partial → warn;
 * overdue/failed/cancelled/refunded → danger;
 * draft/unknown → secondary.
 */
export function paymentStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = normalizePaymentStatusKey(status);

    if (k === '0') {
        return 'warn';
    }
    if (k === '1') {
        return 'success';
    }
    if (k === '2') {
        return 'danger';
    }
    if (k === 'paid' || k === 'completed' || k === 'settled') {
        return 'success';
    }
    if (k === 'pending' || k === 'scheduled' || k === 'partial') {
        return 'warn';
    }
    if (k === 'overdue' || k === 'failed' || k === 'cancelled' || k === 'canceled' || k === 'refunded') {
        return 'danger';
    }
    if (k === 'draft' || k === 'unknown') {
        return 'secondary';
    }
    if (k === 'created' || k === 'active' || k === 'closed') {
        return 'info';
    }
    if (k === 'done') {
        return 'success';
    }

    return 'secondary';
}
