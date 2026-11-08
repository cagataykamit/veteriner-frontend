import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type {
    WaitlistEntryStatus,
    WaitlistEventType,
    WaitlistOfferBlocker,
    WaitlistOfferStatus,
    WaitlistSlotDto,
    WaitlistWeekday
} from '@/app/entities/waitlist/models/waitlist.model';

export const WAITLIST_STATUS_LABELS: Readonly<Record<WaitlistEntryStatus, string>> = {
    Waiting: 'Sırada',
    Booked: 'Randevu aldı',
    Closed: 'Kapatıldı'
};

const STATUS_SEVERITY: Readonly<Record<WaitlistEntryStatus, StatusTagSeverity>> = {
    Waiting: 'info',
    Booked: 'success',
    Closed: 'secondary'
};

const OFFER_STATUS_LABELS: Readonly<Record<WaitlistOfferStatus, string>> = {
    Open: 'Teklif bekleniyor',
    Accepted: 'Kabul etti',
    Declined: 'İstemedi',
    Expired: 'Süre doldu',
    SlotTaken: 'Saat doluydu',
    Withdrawn: 'Geri çekildi'
};

const EVENT_LABELS: Readonly<Record<WaitlistEventType, string>> = {
    Added: 'Listeye eklendi',
    OfferSent: 'Teklif gitti',
    OfferExpired: 'Teklifin süresi doldu',
    OfferDeclined: 'Teklifi istemedi',
    OfferAccepted: 'Teklifi kabul etti, randevu oluştu',
    OfferSlotTaken: 'Kabul etti ama saat doluydu',
    OfferWithdrawn: 'Teklif geri çekildi',
    Closed: 'Kayıt kapatıldı',
    MovedUp: 'Sırada öne alındı',
    MovedDown: 'Sırada geriye alındı'
};

const BLOCKER_LABELS: Readonly<Record<WaitlistOfferBlocker, string | null>> = {
    None: null,
    NoEmail: 'E-postası yok; teklif gitmez',
    RemindersOff: 'Hatırlatma istemiyor; teklif gitmez'
};

export const WAITLIST_WEEKDAYS: readonly { value: WaitlistWeekday; label: string; short: string }[] = [
    { value: 'Monday', label: 'Pazartesi', short: 'Pzt' },
    { value: 'Tuesday', label: 'Salı', short: 'Sal' },
    { value: 'Wednesday', label: 'Çarşamba', short: 'Çar' },
    { value: 'Thursday', label: 'Perşembe', short: 'Per' },
    { value: 'Friday', label: 'Cuma', short: 'Cum' },
    { value: 'Saturday', label: 'Cumartesi', short: 'Cmt' },
    { value: 'Sunday', label: 'Pazar', short: 'Paz' }
];

export const waitlistStatusLabel = (s: WaitlistEntryStatus): string => WAITLIST_STATUS_LABELS[s] ?? s;
export const waitlistStatusSeverity = (s: WaitlistEntryStatus): StatusTagSeverity => STATUS_SEVERITY[s] ?? 'secondary';
export const waitlistOfferStatusLabel = (s: WaitlistOfferStatus): string => OFFER_STATUS_LABELS[s] ?? s;
export const waitlistEventLabel = (t: WaitlistEventType): string => EVENT_LABELS[t] ?? t;
export const waitlistBlockerLabel = (b: WaitlistOfferBlocker): string | null => BLOCKER_LABELS[b] ?? null;

/** Sunucudaki gün bayrağı listesi (`None` ya da `Monday, Wednesday`) → kısa Türkçe metin; boşsa "Her gün". */
export function waitlistDaysText(preferredDays: string): string {
    const days = parseWaitlistDays(preferredDays);

    return days.length === 0 || days.length === WAITLIST_WEEKDAYS.length
        ? 'Her gün'
        : WAITLIST_WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.short).join(', ');
}

export function parseWaitlistDays(preferredDays: string): WaitlistWeekday[] {
    return (preferredDays ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter((x): x is WaitlistWeekday => WAITLIST_WEEKDAYS.some((d) => d.value === x));
}

/** Seçili günler → sunucu gövdesi (`None` her gün). */
export function waitlistDaysBody(days: readonly WaitlistWeekday[]): string {
    return days.length === 0 ? 'None' : days.join(', ');
}

/** `HH:mm:ss` → `HH:mm`. */
export function waitlistTimeText(value: string | null): string | null {
    return value ? value.slice(0, 5) : null;
}

/**
 * Boşalan saat için tek cümle (iptal ekranı ve Bugün): uygun kişi sayısı ve teklifin durumu. Bekleme listesinde uyan kimse yoksa
 * `null` (gösterilmez).
 */
export function waitlistSlotSummary(slot: WaitlistSlotDto): string | null {
    if (slot.isBooked) {
        return 'Bu saat bekleme listesinden doldu.';
    }

    if (slot.openOffer) {
        return 'Bekleme listesinde sıradaki kişiye teklif gitti; yanıt bekleniyor.';
    }

    if (slot.eligibleCount === 0 && slot.blockedCount === 0) {
        return null;
    }

    const blocked = slot.blockedCount > 0 ? ` (${slot.blockedCount} kişiye e-posta gidemiyor)` : '';

    if (slot.eligibleCount === 0) {
        return `Bekleme listesinde bu saate uyan ${slot.blockedCount} kişi var ama hiçbirine e-posta gidemiyor; arayabilirsiniz.`;
    }

    return slot.autoOfferEnabled
        ? `Bekleme listesinde bu saate uygun ${slot.eligibleCount} kişi var${blocked}. Teklif sıradakine otomatik gider.`
        : `Bekleme listesinde bu saate uygun ${slot.eligibleCount} kişi var${blocked}. Otomatik teklif kapalı; teklifi siz gönderebilirsiniz.`;
}
