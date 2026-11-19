import type { TodayItemVm, VisitCareStatus, VisitCorrectionAction } from '@/app/entities/visit/models/visit-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { canMarkAppointmentNoShow, canRevertAppointmentNoShow } from '@/app/entities/appointment/utils/appointment-status.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay, parseUtcApiInstantIsoString, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

const CARE_STATUS_LABEL: Record<VisitCareStatus, string> = {
    Waiting: 'Sırada',
    InProgress: 'Muayenede',
    Completed: 'Tamamlandı'
};

export function careStatusLabel(status: VisitCareStatus): string {
    return CARE_STATUS_LABEL[status];
}

/** Bugün satırının durum tonu: bakım durumu ve (Visit yoksa) randevu durumu birleşik. Renk tonu ile metin aynı yerden gelir. */
export type TodayStatusTone = 'planned' | 'waiting' | 'inProgress' | 'completed' | 'noShow';

const TODAY_STATUS_LABEL: Record<TodayStatusTone, string> = {
    planned: 'Bekleniyor',
    waiting: CARE_STATUS_LABEL.Waiting,
    inProgress: CARE_STATUS_LABEL.InProgress,
    completed: CARE_STATUS_LABEL.Completed,
    noShow: 'Gelmedi'
};

export interface TodayStatus {
    tone: TodayStatusTone;
    label: string;
    /** Kısa ek: bekleniyorsa "10 dk sonra" / "15 dk gecikti", klinikteyse gelişten bu yana süre; yoksa `null`. */
    detail: string | null;
}

export function todayStatusLabel(tone: TodayStatusTone): string {
    return TODAY_STATUS_LABEL[tone];
}

function todayStatusTone(item: TodayItemVm): TodayStatusTone {
    switch (item.careStatus) {
        case 'Waiting':
            return 'waiting';
        case 'InProgress':
            return 'inProgress';
        case 'Completed':
            return 'completed';
    }

    if (item.appointmentStatus === 'NoShow') {
        return 'noShow';
    }

    return item.appointmentStatus === 'Completed' ? 'completed' : 'planned';
}

/** Durum hücresi: tek satır metin; yanlış işaretli satırda süre yazılmaz (iş kapanmıştır). */
export function todayStatusOf(item: TodayItemVm, now: Date): TodayStatus {
    const tone = todayStatusTone(item);
    let detail: string | null = null;

    if (!item.isVoided && (tone === 'waiting' || tone === 'inProgress')) {
        detail = formatElapsedSince(item.arrivedAtUtc, now);
    } else if (tone === 'planned') {
        detail = formatScheduledOffset(item.scheduledAtUtc, now);
    }

    return { tone, label: TODAY_STATUS_LABEL[tone], detail };
}

/**
 * Randevu saatine göre kısa ek: bir saatten azsa dakika ("10 dk sonra", "15 dk gecikti"), fazlası yuvarlanmış tam saat ("9 sa sonra");
 * saat sütunu kesin zamanı zaten gösterir. Dakika dolmadıysa "şimdi". Saat yoksa/geçersizse `null`.
 */
function formatScheduledOffset(scheduledAtUtc: string | null, now: Date): string | null {
    const scheduled = parseUtcApiInstantIsoString(scheduledAtUtc);

    if (!scheduled) {
        return null;
    }

    const minutes = Math.trunc((scheduled.getTime() - now.getTime()) / 60_000);

    if (minutes === 0) {
        return 'şimdi';
    }

    const abs = Math.abs(minutes);
    const amount = abs < 60 ? `${abs} dk` : `${Math.round(abs / 60)} sa`;

    return minutes > 0 ? `${amount} sonra` : `${amount} gecikti`;
}

/** "12 dk", "1 sa 5 dk", "2 sa" (dakika > 0). */
function durationText(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} dk`;
    }

    const rest = minutes % 60;

    return rest ? `${Math.floor(minutes / 60)} sa ${rest} dk` : `${Math.floor(minutes / 60)} sa`;
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
            // İşlemsiz tamamlanmış ziyaret de (ücretsiz işaretlenmediyse) "Ücret yok" sayılır (OPEN_ITEMS madde 1a).
            title: n && n > 0 ? `${n} işlem var, ücret kaydı yok` : 'Ücret kaydı yok',
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

export type TodayGroupKey = 'clinic' | 'planned' | 'completed' | 'noShow' | 'voided';

export interface TodayGroup {
    key: TodayGroupKey;
    title: string;
    items: TodayItemVm[];
}

/** Açık iş önce: klinikteki hasta (sırada / muayenede), sonra gelecek randevular; bitmiş iş en altta. */
const GROUP_ORDER: ReadonlyArray<{ key: TodayGroupKey; title: string }> = [
    { key: 'clinic', title: 'Klinikte' },
    { key: 'planned', title: 'Sıradaki randevular' },
    { key: 'completed', title: 'Tamamlandı' },
    { key: 'noShow', title: 'Gelmedi' },
    { key: 'voided', title: 'Yanlış işaretlenenler' }
];

function groupKeyOf(item: TodayItemVm): TodayGroupKey {
    if (item.isVoided) {
        return 'voided';
    }

    if (!item.visitId && item.appointmentStatus === 'NoShow') {
        return 'noShow';
    }

    // Gelişi açılmadan (ör. doğrudan muayeneyle) tamamlanan randevu bitmiş iştir; "Planlı" altında görünmez.
    if (!item.visitId && item.appointmentStatus === 'Completed') {
        return 'completed';
    }

    switch (item.careStatus) {
        case 'Waiting':
        case 'InProgress':
            return 'clinic';
        case 'Completed':
            return 'completed';
        default:
            return 'planned';
    }
}

/**
 * Sözleşme: açık Visit (Sırada / Muayenede) "Klinikte", `careStatus` boş satır "Sıradaki randevular"a gider (Visit'siz tamamlanmış randevu
 * "Tamamlandı"ya). Grup içi sıra sunucudan gelir (saat sırası; klinikte sırada ve muayenede karışık kalır). Boş gruplar atılır.
 */
export function groupTodayItems(items: readonly TodayItemVm[]): TodayGroup[] {
    return GROUP_ORDER.map((g) => ({ ...g, items: items.filter((i) => groupKeyOf(i) === g.key) })).filter((g) => g.items.length > 0);
}

/** Tamamlanmış satırda iş kaldı mı (açık iş çipi ya da ödenmemiş kalan)? Katlanmış "Tamamlandı" bölümünde bu satırlar görünür kalır. */
export function todayHasOpenWork(item: TodayItemVm): boolean {
    return (item.outstandingAmount ?? 0) > 0 || todayOpenChips(item).length > 0;
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
    /** Geliş hazırlığı (neden, şablon) yalnızca açık, yanlış işaretli olmayan Visit'te düzenlenir (sözleşme §4.5). */
    canEditPreparation: boolean;
    /** Planlı satırdan "Gelmedi": Visit'siz, saati geçmiş `Scheduled` randevu (yetki ayrıca denetlenir). */
    canMarkNoShow: boolean;
    /** "Gelmedi" grubundaki Visit'siz randevu satırından geri alma (yetki ayrıca denetlenir). */
    canRevertNoShow: boolean;
    /** Tamamlanmış ziyaretin kalanı var: satırın birincil adımı "Ödeme al" (yetki ayrıca denetlenir; menüde de kalır). */
    canCollectRemaining: boolean;
    /** Tamamlanmış ziyaretin hiç ücreti yok ve ücretsiz işaretlenmemiş: satırın birincil adımı "Ücret ekle" (menüde de kalır). */
    canAddMissingCharge: boolean;
}

/**
 * "Tamamla"dan önce sorulsun mu: ziyarette ne muayene/işlem ne ücret var (`NoChargeableWork`; ücret okuma izni yoksa alan null
 * ve sorulmaz). Kullanıcı Muayene aç / Ücret ekle / Ücretsiz tamamla arasında seçer (kullanıcı kararı 2026-11-19).
 */
export function todayNeedsCompletionPrompt(item: TodayItemVm): boolean {
    return item.careStatus === 'InProgress' && item.chargeIndicator === 'NoChargeableWork' && (item.pendingChargeCount ?? 0) === 0;
}

export function todayItemActions(item: TodayItemVm, now: Date = new Date()): TodayItemActions {
    const noShowRow = !item.visitId && !!item.appointmentId;

    if (item.isVoided) {
        return {
            canMarkArrived: false,
            canStartCare: false,
            canOpenExamination: false,
            canCompleteCare: false,
            canCorrect: false,
            canRestore: !!item.visitId,
            canToggleUrgency: false,
            canEditPreparation: false,
            canMarkNoShow: false,
            canRevertNoShow: false,
            canCollectRemaining: false,
            canAddMissingCharge: false
        };
    }

    const open = item.careStatus === 'Waiting' || item.careStatus === 'InProgress';

    return {
        canMarkArrived: noShowRow && (item.appointmentStatus === 'Scheduled' || item.appointmentStatus === 'NoShow'),
        // Sırada satırında "Muayeneye al" hem başlatır hem muayeneyi açar; ayrı "Muayene aç" yalnız muayenedeki hastada.
        canStartCare: item.careStatus === 'Waiting',
        canOpenExamination: item.careStatus === 'InProgress',
        canCompleteCare: item.careStatus === 'InProgress',
        canCorrect: !!item.visitId,
        canRestore: false,
        canToggleUrgency: open && !!item.visitId,
        canEditPreparation: open && !!item.visitId,
        canMarkNoShow: noShowRow && canMarkAppointmentNoShow(item.appointmentStatus, item.scheduledAtUtc, now),
        canRevertNoShow: noShowRow && canRevertAppointmentNoShow(item.appointmentStatus),
        canCollectRemaining: item.careStatus === 'Completed' && (item.outstandingAmount ?? 0) > 0,
        canAddMissingCharge: item.careStatus === 'Completed' && item.chargeIndicator === 'ChargeMissing' && (item.pendingChargeCount ?? 0) === 0
    };
}

/** Geliş anından bu yana geçen süre: "Az önce", "12 dk", "1 sa 5 dk"; bir günü geçtiyse "6 gün" (H15). Geliş yoksa/geçersizse `null`. */
export function formatElapsedSince(arrivedAtUtc: string | null, now: Date): string | null {
    const arrived = parseUtcApiInstantIsoString(arrivedAtUtc);

    if (!arrived) {
        return null;
    }

    const minutes = Math.floor((now.getTime() - arrived.getTime()) / 60_000);

    if (minutes < 1) {
        return 'Az önce';
    }

    return minutes >= 24 * 60 ? `${Math.floor(minutes / (24 * 60))} gün` : durationText(minutes);
}

/** Bugün satırındaki geliş zamanı: bugünse yalnız saat, önceki günden açık kalmışsa tarih ve saat (H15). */
export function formatTodayArrival(arrivedAtUtc: string | null, now: Date): string {
    const time = formatUtcIsoAsLocalTimeDisplay(arrivedAtUtc);

    if (!arrivedAtUtc || toIstanbulDateInputValue(arrivedAtUtc) === toIstanbulDateInputValue(now.toISOString())) {
        return time;
    }

    return `${formatUtcIsoAsLocalDateDisplay(arrivedAtUtc)} ${time}`;
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

/** Satırdaki kısa neden: gelişte yazılan neden, yoksa randevu nedeni (planlı satırda geliş nedeni hiç yoktur). */
export function todayReasonText(item: Pick<TodayItemVm, 'arrivalReason' | 'appointmentReasonName'>): string | null {
    return item.arrivalReason ?? item.appointmentReasonName;
}

export type TodaySecondaryActionKey = 'markNoShow' | 'revertNoShow' | 'correct' | 'restore' | 'collectPayment' | 'addCharge' | 'bookAppointment' | 'editPreparation' | 'toggleUrgency';

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
    canCreateCharge: boolean;
    canCreateAppointment: boolean;
}

/**
 * Satırın seyrek/düzeltme eylemleri ("⋯" menüsü). Satırda görünür kalanlar: tek birincil adım (Geldi, Başlat, Tamamla ya da tamamlanmış
 * satırda kalan için Ödeme al) ve klinikteki hastada Muayene aç. Görünür/menü ayrımı burada tek yerde belirlenir.
 */
export function todaySecondaryActions(item: TodayItemVm, actions: TodayItemActions, perms: TodayRowPermissions): TodaySecondaryAction[] {
    const out: TodaySecondaryAction[] = [];

    if (perms.canCreateCharge && !item.isVoided) {
        out.push({ key: 'addCharge', label: 'Ücret ekle', icon: 'pi pi-plus' });
    }

    if (perms.canCollectPayment && !item.isVoided) {
        out.push({ key: 'collectPayment', label: 'Ödeme al', icon: 'pi pi-wallet' });
    }

    // Gelişin sonunda kontrol/aşı tekrarı için sonraki randevu (O9); planlı satırın randevusu zaten vardır.
    if (perms.canCreateAppointment && item.visitId && !item.isVoided) {
        out.push({ key: 'bookAppointment', label: 'Randevu al', icon: 'pi pi-calendar-plus' });
    }

    if (perms.canUpdateVisit && actions.canEditPreparation) {
        out.push({ key: 'editPreparation', label: 'Hazırlığı düzenle', icon: 'pi pi-clipboard' });
    }

    // Acil işaretli satır hasta adının yanında kırmızı "Acil" etiketi taşır; aç/kapat menüdedir.
    if (perms.canUpdateVisit && actions.canToggleUrgency) {
        out.push({ key: 'toggleUrgency', label: item.isUrgent ? 'Acil işaretini kaldır' : 'Acil olarak işaretle', icon: 'pi pi-exclamation-triangle' });
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
