import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

/** Liste filtreleri ve etiket eşlemesi için (örn. due-soon → duesoon). */
export function normalizeVaccinationStatusKey(status: string): string {
    return normalizeFilterKey(status);
}

const LABELS: Record<string, string> = {
    applied: 'Uygulandı',
    completed: 'Tamamlandı',
    upcoming: 'Yaklaşan',
    scheduled: 'Planlandı',
    duesoon: 'Yakında',
    overdue: 'Gecikmiş',
    missed: 'Kaçırıldı',
    cancelled: 'İptal',
    canceled: 'İptal',
    unknown: 'Bilinmiyor',
    passive: 'Pasif'
};

export function vaccinationStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const k = normalizeVaccinationStatusKey(status);
    return LABELS[k] ?? status;
}

/**
 * Aşı durumları — severity tek yerden.
 * applied/completed → success; upcoming/scheduled/due-soon → warn;
 * overdue/missed/cancelled → danger; unknown/passive → secondary.
 */
export function vaccinationStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = normalizeVaccinationStatusKey(status);

    if (k === 'applied' || k === 'completed') {
        return 'success';
    }
    if (k === 'upcoming' || k === 'scheduled' || k === 'duesoon') {
        return 'warn';
    }
    if (k === 'overdue' || k === 'missed' || k === 'cancelled' || k === 'canceled') {
        return 'danger';
    }
    if (k === 'unknown' || k === 'passive') {
        return 'secondary';
    }

    return 'secondary';
}
