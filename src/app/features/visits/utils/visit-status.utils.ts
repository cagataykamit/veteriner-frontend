import type { TodayItemVm, TodayPaymentIndicator, VisitCareStatus, VisitCorrectionAction } from '@/app/features/visits/models/visit-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { canMarkAppointmentNoShow, canRevertAppointmentNoShow } from '@/app/features/appointments/utils/appointment-status.utils';
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

export type TodayGroupKey = 'waiting' | 'inProgress' | 'planned' | 'completed' | 'voided' | 'noShow';

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
    { key: 'completed', title: 'Tamamlandı', elapsedLabel: null },
    { key: 'voided', title: 'Yanlış işaretlenenler', elapsedLabel: null },
    { key: 'noShow', title: 'Gelmedi', elapsedLabel: null }
];

function groupKeyOf(item: TodayItemVm): TodayGroupKey {
    if (item.isVoided) {
        return 'voided';
    }
    if (!item.visitId && item.appointmentStatus === 'NoShow') {
        return 'noShow';
    }
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
    /** Randevudan "Geldi": yalnızca Visit'i olmayan, `Scheduled` veya `NoShow` (geç gelen hasta) randevu. */
    canMarkArrived: boolean;
    canStartCare: boolean;
    canOpenExamination: boolean;
    canCompleteCare: boolean;
    /** Düzeltme herhangi bir Visit için mümkündür (yetki ayrıca denetlenir). */
    canCorrect: boolean;
    /** Yanlış geliş işaretini kaldırma (yetki ayrıca denetlenir). */
    canRestore: boolean;
    /** Acil işareti yalnızca açık (bekleyen / devam eden) kayıtta değiştirilir. */
    canToggleUrgency: boolean;
    /** Planlı satırdan "Gelmedi": Visit'siz, saati geçmiş `Scheduled` randevu (yetki ayrıca denetlenir). */
    canMarkNoShow: boolean;
    /** "Gelmedi" grubundaki Visit'siz randevu satırından geri alma (yetki ayrıca denetlenir). */
    canRevertNoShow: boolean;
}

export function todayItemActions(item: TodayItemVm, now: Date = new Date()): TodayItemActions {
    const noShowRow = !item.visitId && !!item.appointmentId;
    if (item.isVoided) {
        return { canMarkArrived: false, canStartCare: false, canOpenExamination: false, canCompleteCare: false, canCorrect: false, canRestore: !!item.visitId, canToggleUrgency: false, canMarkNoShow: false, canRevertNoShow: false };
    }
    const open = item.careStatus === 'Waiting' || item.careStatus === 'InProgress';
    return {
        canMarkArrived: noShowRow && (item.appointmentStatus === 'Scheduled' || item.appointmentStatus === 'NoShow'),
        canStartCare: item.careStatus === 'Waiting',
        canOpenExamination: open,
        canCompleteCare: item.careStatus === 'InProgress',
        canCorrect: !!item.visitId,
        canRestore: false,
        canToggleUrgency: open && !!item.visitId,
        canMarkNoShow: noShowRow && canMarkAppointmentNoShow(item.appointmentStatus, item.scheduledAtUtc, now),
        canRevertNoShow: noShowRow && canRevertAppointmentNoShow(item.appointmentStatus)
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

/** Bekleme uyarı eşikleri (dakika); ayar ekranı gelene kadar tek yerde sabit. */
export const WAIT_WARNING_MINUTES = 30;
export const WAIT_CRITICAL_MINUTES = 60;

export type WaitAlertLevel = 'none' | 'warning' | 'critical';

/** Yalnızca "Bekliyor" satırı için; "Devam ediyor" ve diğerleri her zaman `none`. Geliş yoksa/geçersizse `none`. */
export function waitAlertLevel(item: TodayItemVm, now: Date): WaitAlertLevel {
    const arrived = item.careStatus === 'Waiting' ? parseUtcApiInstantIsoString(item.arrivedAtUtc) : null;
    if (!arrived) {
        return 'none';
    }
    const minutes = Math.floor((now.getTime() - arrived.getTime()) / 60_000);
    if (minutes >= WAIT_CRITICAL_MINUTES) {
        return 'critical';
    }
    return minutes >= WAIT_WARNING_MINUTES ? 'warning' : 'none';
}

const WAIT_ALERT_TITLE: Record<Exclude<WaitAlertLevel, 'none'>, string> = {
    warning: `${WAIT_WARNING_MINUTES} dakikayı aşan bekleme`,
    critical: `${WAIT_CRITICAL_MINUTES} dakikayı aşan bekleme`
};

/** Renge ek erişilebilir ipucu (title / ekran okuyucu metni); uyarı yoksa `null`. */
export function waitAlertTitle(level: WaitAlertLevel): string | null {
    return level === 'none' ? null : WAIT_ALERT_TITLE[level];
}

export type TodaySecondaryActionKey = 'markNoShow' | 'revertNoShow' | 'correct' | 'restore';

export interface TodaySecondaryAction {
    key: TodaySecondaryActionKey;
    label: string;
    icon: string;
}

export interface TodayRowPermissions {
    canUpdateVisit: boolean;
    canNoShow: boolean;
    canCorrect: boolean;
}

/**
 * Satırın seyrek/düzeltme eylemleri ("⋯" menüsü). Satırda görünür kalanlar: Geldi, Muayene aç, Başlat/Tamamla ve acil ikonu
 * (`todayUrgencyToggle`). Görünür/menü ayrımı burada tek yerde belirlenir.
 */
export function todaySecondaryActions(item: TodayItemVm, actions: TodayItemActions, perms: TodayRowPermissions): TodaySecondaryAction[] {
    const out: TodaySecondaryAction[] = [];
    if (perms.canNoShow && actions.canMarkNoShow) {
        out.push({ key: 'markNoShow', label: 'Gelmedi olarak işaretle', icon: 'pi pi-user-minus' });
    }
    if (perms.canNoShow && actions.canRevertNoShow) {
        out.push({ key: 'revertNoShow', label: 'Gelmedi işaretini geri al', icon: 'pi pi-undo' });
    }
    if (perms.canCorrect && actions.canRestore) {
        out.push({ key: 'restore', label: 'Geri al', icon: 'pi pi-undo' });
    }
    if (perms.canCorrect && actions.canCorrect) {
        out.push({ key: 'correct', label: 'Düzelt', icon: 'pi pi-pencil' });
    }
    return out;
}

export interface TodayUrgencyToggle {
    /** Düğme ipucu ve erişilebilir ad. */
    label: string;
    /** İşaretliyse düğme belirgin (basılı) durumda. */
    pressed: boolean;
}

/** Zaman açısından kritik acil aç/kapat eylemi satırda ikon düğmesi olarak görünür; yetki/koşul yoksa `null`. */
export function todayUrgencyToggle(item: TodayItemVm, actions: TodayItemActions, perms: TodayRowPermissions): TodayUrgencyToggle | null {
    if (!perms.canUpdateVisit || !actions.canToggleUrgency) {
        return null;
    }
    return { label: item.isUrgent ? 'Acili kaldır' : 'Acil işaretle', pressed: item.isUrgent };
}
