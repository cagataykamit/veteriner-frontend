import type { TodayItemVm, VisitCareStatus, VisitCorrectionAction } from '@/app/features/visits/models/visit-vm.model';
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

export type TodayOpenChipKey = 'chargePending' | 'chargeMissing' | 'awaitingLab' | 'paymentPending' | 'partiallyPaid';

export interface TodayOpenChip {
    key: TodayOpenChipKey;
    label: string;
    severity: StatusTagSeverity;
    icon: string;
    title: string;
    /** Çipten ödemeye geçilebilir (açık ücret var). */
    payable: boolean;
    /** Çipten Ücretlendir ekranına (bekleyen kalemler) geçilebilir. */
    reviewable: boolean;
}

/**
 * Satırın hesaplanan açık iş çipleri, kritik olan önce (Ücret bekliyor / Ücret yok, Lab bekliyor, sonra ödeme). `null` değer "yok" demek değildir
 * (yetki yok veya planlı satır): çip üretilmez. `Paid` ve `NoChargeableWork` çip üretmez. "Önceki günden açık" Durum hücresindedir.
 */
export function todayOpenChips(item: Pick<TodayItemVm, 'chargeIndicator' | 'chargeableWorkCount' | 'awaitingLabCount' | 'pendingChargeCount'>): TodayOpenChip[] {
    const chips: TodayOpenChip[] = [];
    const pendingCharges = item.pendingChargeCount ?? 0;

    if (pendingCharges > 0) {
        // Bekleyen kalem varken "Ücret yok" yanıltıcıdır: ücret henüz yazılmadı ama karar bekleyen kalem var (ADR-018).
        chips.push({
            key: 'chargePending',
            label: `Ücret bekliyor (${pendingCharges})`,
            severity: 'warn',
            icon: 'pi pi-receipt',
            title: `${pendingCharges} kalem ücrete çevrilmeyi bekliyor`,
            payable: false,
            reviewable: true
        });
    } else if (item.chargeIndicator === 'ChargeMissing') {
        const n = item.chargeableWorkCount;

        chips.push({
            key: 'chargeMissing',
            label: 'Ücret yok',
            severity: 'danger',
            icon: 'pi pi-exclamation-circle',
            title: n && n > 0 ? `${n} işlem var, ücret kaydı yok` : 'İşlem var, ücret kaydı yok',
            payable: false,
            reviewable: false
        });
    }

    if ((item.awaitingLabCount ?? 0) > 0) {
        chips.push({
            key: 'awaitingLab',
            label: `Lab bekliyor (${item.awaitingLabCount})`,
            severity: 'warn',
            icon: 'pi pi-clock',
            title: 'Sonucu girilmemiş lab isteği var',
            payable: false,
            reviewable: false
        });
    }

    if (item.chargeIndicator === 'PaymentPending') {
        chips.push({ key: 'paymentPending', label: 'Ödeme bekliyor', severity: 'warn', icon: 'pi pi-wallet', title: 'Ücret açık, ödeme alınmadı', payable: true, reviewable: false });
    } else if (item.chargeIndicator === 'PartiallyPaid') {
        chips.push({ key: 'partiallyPaid', label: 'Kısmi ödeme', severity: 'info', icon: 'pi pi-wallet', title: 'Ücretin bir kısmı ödendi, kalan açık', payable: true, reviewable: false });
    }

    return chips;
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

/** Yatış süresi: bir günden kısaysa saat/dakika, değilse tam gün sayısı. */
export function formatHospitalizationStay(admittedAtUtc: string | null, now: Date): string | null {
    const admitted = parseUtcApiInstantIsoString(admittedAtUtc);

    if (!admitted) {
        return null;
    }

    const days = Math.floor((now.getTime() - admitted.getTime()) / 86_400_000);

    return days >= 1 ? `${days} gün` : formatElapsedSince(admittedAtUtc, now);
}

/** Açık (Bekliyor/Devam ediyor) bir geliş bu süreyi aşarsa satırda yalnız görsel "unutulmuş olabilir" ipucu gösterilir (iş kuralı yok). */
export const FORGOTTEN_VISIT_HOURS = 12;

/** Açık geliş `FORGOTTEN_VISIT_HOURS` saati aştı mı? Kapalı/planlı satır ve geçersiz geliş için `false`. */
export function isPossiblyForgottenVisit(item: TodayItemVm, now: Date): boolean {
    const open = item.careStatus === 'Waiting' || item.careStatus === 'InProgress';
    const arrived = open ? parseUtcApiInstantIsoString(item.arrivedAtUtc) : null;

    return !!arrived && now.getTime() - arrived.getTime() >= FORGOTTEN_VISIT_HOURS * 3_600_000;
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

export type TodaySecondaryActionKey = 'markNoShow' | 'revertNoShow' | 'correct' | 'restore' | 'collectPayment';

export interface TodaySecondaryAction {
    key: TodaySecondaryActionKey;
    label: string;
    icon: string;
}

export interface TodayRowPermissions {
    canUpdateVisit: boolean;
    canNoShow: boolean;
    canCorrect: boolean;
    canCollectPayment: boolean;
}

/**
 * Satırın seyrek/düzeltme eylemleri ("⋯" menüsü). Satırda görünür kalanlar: Geldi, Muayene aç, Başlat/Tamamla ve acil ikonu
 * (`todayUrgencyToggle`). Görünür/menü ayrımı burada tek yerde belirlenir.
 */
export function todaySecondaryActions(item: TodayItemVm, actions: TodayItemActions, perms: TodayRowPermissions): TodaySecondaryAction[] {
    const out: TodaySecondaryAction[] = [];

    if (perms.canCollectPayment && !item.isVoided) {
        out.push({ key: 'collectPayment', label: 'Ödeme al', icon: 'pi pi-wallet' });
    }

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
