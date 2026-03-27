import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

/** Liste filtreleri ve etiket eşlemesi için (örn. due-soon → duesoon). */
export function normalizeVaccinationStatusKey(status: string): string {
    return normalizeFilterKey(status);
}

const LABELS: Record<string, string> = {
    '0': 'Uygulandı',
    '1': 'Yaklaşan',
    '2': 'Gecikmiş',
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
    passive: 'Pasif',
    created: 'Oluşturuldu',
    active: 'Aktif',
    closed: 'Kapandı',
    done: 'Tamamlandı',
    failed: 'Başarısız'
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
/** Yeni kayıt formu — liste filtresindeki değerlerle uyumlu (Tümü yok). */
export const VACCINATION_STATUS_FORM_OPTIONS = [
    { label: 'Uygulandı', value: 'applied' },
    { label: 'Tamamlandı', value: 'completed' },
    { label: 'Yaklaşan', value: 'upcoming' },
    { label: 'Planlandı', value: 'scheduled' },
    { label: 'Yakında', value: 'due-soon' },
    { label: 'Gecikmiş', value: 'overdue' },
    { label: 'Kaçırıldı', value: 'missed' },
    { label: 'İptal', value: 'cancelled' },
    { label: 'Bilinmiyor', value: 'unknown' },
    { label: 'Pasif', value: 'passive' }
] as const;

/**
 * Strict write contract için izin verilen durumlar.
 * - Scheduled (Planlandı)
 * - Applied (Uygulandı)
 * - Cancelled (İptal)
 */
export const VACCINATION_WRITE_STATUS_OPTIONS = [
    { label: 'Planlandı', value: 'scheduled' },
    { label: 'Uygulandı', value: 'applied' },
    { label: 'İptal', value: 'cancelled' }
] as const;

export type VaccinationWriteStatus = (typeof VACCINATION_WRITE_STATUS_OPTIONS)[number]['value'];

export function vaccinationStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const k = normalizeVaccinationStatusKey(status);

    if (k === '0') {
        return 'success';
    }
    if (k === '1') {
        return 'warn';
    }
    if (k === '2') {
        return 'danger';
    }
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
