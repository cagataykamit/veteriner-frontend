import type { PerformanceAppointmentCountsDto } from '@/app/features/reports/performance/models/performance-summary.model';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';

export type PerformancePreset = 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'custom';

export const PERFORMANCE_PRESET_OPTIONS: { label: string; value: PerformancePreset }[] = [
    { label: 'Bu ay', value: 'thisMonth' },
    { label: 'Geçen ay', value: 'lastMonth' },
    { label: 'Son 30 gün', value: 'last30' },
    { label: 'Bu yıl', value: 'thisYear' },
    { label: 'Özel', value: 'custom' }
];

/** Hazır dönem → `yyyy-MM-dd` aralığı (yerel takvim, ikisi dahil). `custom` için `null`: kullanıcı tarihleri seçer. */
export function performancePresetRange(preset: PerformancePreset, today: Date = new Date()): { from: string; to: string } | null {
    const y = today.getFullYear();
    const m = today.getMonth();

    switch (preset) {
        case 'thisMonth':
            return { from: localDateYyyyMmDd(new Date(y, m, 1)), to: localDateYyyyMmDd(today) };
        case 'lastMonth':
            return { from: localDateYyyyMmDd(new Date(y, m - 1, 1)), to: localDateYyyyMmDd(new Date(y, m, 0)) };
        case 'last30':
            return { from: localDateYyyyMmDd(new Date(y, m, today.getDate() - 29)), to: localDateYyyyMmDd(today) };
        case 'thisYear':
            return { from: localDateYyyyMmDd(new Date(y, 0, 1)), to: localDateYyyyMmDd(today) };
        default:
            return null;
    }
}

export interface PerformanceDelta {
    readonly diff: number;
    /** Önceki dönem 0 ise yüzde anlamsız: `null`. */
    readonly percent: number | null;
    readonly direction: 'up' | 'down' | 'flat';
}

/** Önceki döneme göre fark; değerlerden biri yoksa (izin ya da karşılaştırma kapalı) `null`. */
export function performanceDelta(current: number | null | undefined, previous: number | null | undefined): PerformanceDelta | null {
    if (current == null || previous == null) {
        return null;
    }

    const diff = current - previous;

    return {
        diff,
        percent: previous === 0 ? null : (diff / Math.abs(previous)) * 100,
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    };
}

/**
 * Net tahsilat ÷ net ciro (yüzde). Önceki dönem ücretlerinin tahsilatı da girdiği için "tahsilat oranı" değildir; ciro 0 ise `null`.
 */
export function collectionToChargeRatio(netCollected: number | null | undefined, netCharge: number | null | undefined): number | null {
    if (netCollected == null || netCharge == null || netCharge <= 0) {
        return null;
    }

    return (netCollected / netCharge) * 100;
}

/** Randevu dağılımı: toplam ve gelmedi / iptal oranı (yüzde; randevu yoksa `null`). */
export function appointmentRates(counts: PerformanceAppointmentCountsDto): { total: number; noShowRate: number | null; cancelRate: number | null } {
    const total = counts.scheduled + counts.completed + counts.cancelled + counts.noShow;

    return {
        total,
        noShowRate: total === 0 ? null : (counts.noShow / total) * 100,
        cancelRate: total === 0 ? null : (counts.cancelled / total) * 100
    };
}

/** Yüzde gösterimi: tek ondalık, Türkçe ayraç. */
export function formatPercent(value: number | null | undefined): string {
    return value == null ? '—' : `%${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
}

/** `yyyy-MM-dd` → `dd.MM.yyyy` (dönem etiketleri). */
export function ymdToDisplay(ymd: string): string {
    return `${ymd.slice(8, 10)}.${ymd.slice(5, 7)}.${ymd.slice(0, 4)}`;
}
