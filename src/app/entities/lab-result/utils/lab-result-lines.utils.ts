import type { LabValueFlag, LabValueTrend } from '@/app/entities/lab-result/models/lab-result-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** İşaret sunucuda hesaplanır; burada yalnız gösterim. Tanı ya da yorum ifadesi kullanılmaz (ADR-049 K6). */
const FLAG_LABELS: Record<LabValueFlag, string> = { Low: 'Düşük', Normal: 'Normal', High: 'Yüksek' };
const FLAG_SEVERITIES: Record<LabValueFlag, StatusTagSeverity> = { Low: 'info', Normal: 'secondary', High: 'danger' };
const TREND_LABELS: Record<LabValueTrend, string> = { Up: 'Önceki sonuca göre arttı', Down: 'Önceki sonuca göre azaldı', Unchanged: 'Önceki sonuçla aynı' };
const TREND_ICONS: Record<LabValueTrend, string> = { Up: 'pi pi-arrow-up', Down: 'pi pi-arrow-down', Unchanged: 'pi pi-minus' };

export function labValueFlagLabel(flag: LabValueFlag): string {
    return FLAG_LABELS[flag];
}

export function labValueFlagSeverity(flag: LabValueFlag): StatusTagSeverity {
    return FLAG_SEVERITIES[flag];
}

export function labValueTrendLabel(trend: LabValueTrend): string {
    return TREND_LABELS[trend];
}

export function labValueTrendIcon(trend: LabValueTrend): string {
    return TREND_ICONS[trend];
}

/** Türkçe ondalık (virgül), en çok 4 basamak. */
export function formatLabNumber(value: number): string {
    return value.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

/** "10–100", yalnız alt sınır "≥ 10", yalnız üst "≤ 100", aralık yoksa boş. */
export function formatLabReferenceRange(low: number | null, high: number | null): string {
    if (low !== null && high !== null) {
        return `${formatLabNumber(low)}–${formatLabNumber(high)}`;
    }

    if (low !== null) {
        return `≥ ${formatLabNumber(low)}`;
    }

    return high !== null ? `≤ ${formatLabNumber(high)}` : '';
}
