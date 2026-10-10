import type { TodayItemVm, TodayPaymentIndicator, VisitCareStatus, VisitCorrectionAction } from '@/app/features/visits/models/visit-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

const CARE_STATUS_LABEL: Record<VisitCareStatus, string> = {
    Waiting: 'Bekliyor',
    InProgress: 'Devam ediyor',
    Completed: 'Tamamlandı'
};

const CARE_STATUS_SEVERITY: Record<VisitCareStatus, StatusTagSeverity> = {
    Waiting: 'warn',
    InProgress: 'info',
    Completed: 'success'
};

export function careStatusLabel(status: VisitCareStatus): string {
    return CARE_STATUS_LABEL[status];
}

export function careStatusSeverity(status: VisitCareStatus): StatusTagSeverity {
    return CARE_STATUS_SEVERITY[status];
}

const PAYMENT_INDICATOR_LABEL: Record<TodayPaymentIndicator, string> = {
    NoPaymentRecorded: 'Ödeme kaydı yok',
    PaymentRecorded: 'Ödeme kaydı var'
};

/** "Ödendi/borçlu" demez: sözleşme yalnızca tahsilat kaydının varlığını bildirir. */
export function paymentIndicatorLabel(indicator: TodayPaymentIndicator): string {
    return PAYMENT_INDICATOR_LABEL[indicator];
}

/** Düzeltme diyaloğu seçenekleri: mevcut durum hariç üç bakım durumu + yanlış geliş işareti. */
export function correctionActionOptions(current: VisitCareStatus): Array<{ label: string; value: VisitCorrectionAction }> {
    const statuses = (Object.keys(CARE_STATUS_LABEL) as VisitCareStatus[])
        .filter((s) => s !== current)
        .map((s) => ({ label: `Durumu “${CARE_STATUS_LABEL[s]}” yap`, value: s as VisitCorrectionAction }));
    return [...statuses, { label: 'Yanlış geliş olarak işaretle', value: 'Mistaken' }];
}

export type TodayGroupKey = 'waiting' | 'inProgress' | 'planned' | 'completed';

export interface TodayGroup {
    key: TodayGroupKey;
    title: string;
    /** Süre sütunu başlığı; `null` ise sütun yok (planlı ve tamamlananlarda gösterilecek süre verisi yok). */
    elapsedLabel: string | null;
    items: TodayItemVm[];
}

const GROUP_ORDER: ReadonlyArray<{ key: TodayGroupKey; title: string; elapsedLabel: string | null }> = [
    { key: 'waiting', title: 'Bekliyor', elapsedLabel: 'Bekleme' },
    { key: 'inProgress', title: 'Devam ediyor', elapsedLabel: 'Süre' },
    { key: 'planned', title: 'Planlı randevular', elapsedLabel: null },
    { key: 'completed', title: 'Tamamlandı', elapsedLabel: null }
];

function groupKeyOf(item: TodayItemVm): TodayGroupKey {
    switch (item.careStatus) {
        case 'Waiting':
            return 'waiting';
        case 'InProgress':
            return 'inProgress';
        case 'Completed':
            return 'completed';
        default:
            return 'planned';
    }
}

/** Sözleşme: `careStatus` dolu satır o gruba, `null` satır "Planlı"ya gider. Grup içi sıra sunucudan gelir. Boş gruplar atılır. */
export function groupTodayItems(items: readonly TodayItemVm[]): TodayGroup[] {
    return GROUP_ORDER.map((g) => ({ ...g, items: items.filter((i) => groupKeyOf(i) === g.key) })).filter((g) => g.items.length > 0);
}

export interface TodayItemActions {
    /** Randevudan "Geldi": yalnızca Visit'i olmayan, `Scheduled` randevu. */
    canMarkArrived: boolean;
    canStartCare: boolean;
    canOpenExamination: boolean;
    canCompleteCare: boolean;
    /** Düzeltme herhangi bir Visit için mümkündür (yetki ayrıca denetlenir). */
    canCorrect: boolean;
}

export function todayItemActions(item: TodayItemVm): TodayItemActions {
    const open = item.careStatus === 'Waiting' || item.careStatus === 'InProgress';
    return {
        canMarkArrived: !item.visitId && !!item.appointmentId && item.appointmentStatus === 'Scheduled',
        canStartCare: item.careStatus === 'Waiting',
        canOpenExamination: open,
        canCompleteCare: item.careStatus === 'InProgress',
        canCorrect: !!item.visitId
    };
}

/** Geliş anından bu yana geçen süre: "Az önce", "12 dk", "1 sa 5 dk". Geliş yoksa/geçersizse `null`. */
export function formatElapsedSince(arrivedAtUtc: string | null, now: Date): string | null {
    const arrived = parseUtcApiInstantIsoString(arrivedAtUtc);
    if (!arrived) {
        return null;
    }
    const minutes = Math.floor((now.getTime() - arrived.getTime()) / 60_000);
    if (minutes < 1) {
        return 'Az önce';
    }
    if (minutes < 60) {
        return `${minutes} dk`;
    }
    const rest = minutes % 60;
    return rest ? `${Math.floor(minutes / 60)} sa ${rest} dk` : `${Math.floor(minutes / 60)} sa`;
}
