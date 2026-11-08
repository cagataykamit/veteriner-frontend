/** Bekleme kaydının durumu (Veteriner `docs/WAITLIST_API_CONTRACT.md` §2). */
export type WaitlistEntryStatus = 'Waiting' | 'Booked' | 'Closed';

export type WaitlistOfferStatus = 'Open' | 'Accepted' | 'Declined' | 'Expired' | 'SlotTaken' | 'Withdrawn';

/** Teklif neden gidemez: e-posta yok ya da hasta sahibi hatırlatma istemiyor (klinik uyarılır). */
export type WaitlistOfferBlocker = 'None' | 'NoEmail' | 'RemindersOff';

export type WaitlistWeekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type WaitlistEventType =
    | 'Added'
    | 'OfferSent'
    | 'OfferExpired'
    | 'OfferDeclined'
    | 'OfferAccepted'
    | 'OfferSlotTaken'
    | 'OfferWithdrawn'
    | 'Closed'
    | 'MovedUp'
    | 'MovedDown';

export interface WaitlistOfferDto {
    readonly id: string;
    readonly status: WaitlistOfferStatus;
    readonly sourceAppointmentId: string;
    readonly slotStartUtc: string;
    readonly durationMinutes: number;
    readonly veterinarianUserId: string | null;
    readonly isAutomatic: boolean;
    readonly createdAtUtc: string;
    readonly expiresAtUtc: string;
    readonly closedAtUtc: string | null;
    readonly appointmentId: string | null;
}

export interface WaitlistEntryDto {
    readonly id: string;
    readonly clinicId: string;
    readonly clientId: string;
    readonly clientName: string;
    readonly petId: string;
    readonly petName: string;
    readonly preferredVeterinarianUserId: string | null;
    readonly preferredVeterinarianName: string | null;
    readonly appointmentType: number;
    readonly reasonId: string | null;
    readonly reasonName: string | null;
    readonly durationMinutes: number | null;
    /** `yyyy-MM-dd` (İstanbul takvim günü). */
    readonly earliestDate: string;
    readonly latestDate: string;
    /** `None` (her gün) ya da virgülle ayrılmış gün listesi, örn. `Monday, Wednesday`. */
    readonly preferredDays: string;
    /** `HH:mm:ss` ya da boş. */
    readonly preferredFromTime: string | null;
    readonly preferredToTime: string | null;
    readonly note: string | null;
    readonly status: WaitlistEntryStatus;
    /** Klinikte sıradakiler arasında 1'den başlayan sıra; kapanmış kayıtta boş. */
    readonly position: number | null;
    readonly isPastRange: boolean;
    readonly offerBlocker: WaitlistOfferBlocker;
    readonly createdAtUtc: string;
    readonly closedAtUtc: string | null;
    readonly closeReason: string | null;
    readonly bookedAppointmentId: string | null;
    readonly openOffer: WaitlistOfferDto | null;
}

export interface WaitlistEventDto {
    readonly type: WaitlistEventType;
    readonly occurredAtUtc: string;
    readonly actorUserId: string | null;
    readonly actorName: string | null;
    readonly offerId: string | null;
    readonly offerSlotStartUtc: string | null;
}

export interface WaitlistEntryDetailDto {
    readonly entry: WaitlistEntryDto;
    readonly events: readonly WaitlistEventDto[];
    readonly offers: readonly WaitlistOfferDto[];
}

export interface WaitlistCandidateDto {
    readonly entryId: string;
    readonly position: number;
    readonly petName: string;
    readonly clientName: string;
    readonly offerBlocker: WaitlistOfferBlocker;
}

/** Boşalan saat (iptal edilen randevu) ve ona uyan kayıtlar (§2 `GET /slots/{appointmentId}`). */
export interface WaitlistSlotDto {
    readonly appointmentId: string;
    readonly startUtc: string;
    readonly durationMinutes: number;
    readonly veterinarianUserId: string | null;
    readonly isReleased: boolean;
    readonly autoOfferEnabled: boolean;
    readonly eligibleCount: number;
    readonly blockedCount: number;
    readonly openOffer: WaitlistOfferDto | null;
    readonly isBooked: boolean;
    readonly candidates: readonly WaitlistCandidateDto[];
}

export interface WaitlistTodayDto {
    readonly waitingCount: number;
    readonly releasedSlots: readonly WaitlistSlotDto[];
}

export interface CreateWaitlistEntryBody {
    readonly clinicId: string;
    readonly clientId: string;
    readonly petId: string;
    readonly preferredVeterinarianUserId: string | null;
    readonly appointmentType: number;
    readonly reasonId: string | null;
    readonly durationMinutes: number | null;
    readonly earliestDate: string;
    readonly latestDate: string;
    readonly preferredDays: string;
    readonly preferredFromTime: string | null;
    readonly preferredToTime: string | null;
    readonly note: string | null;
}

export interface WaitlistListQuery {
    readonly clinicId?: string | null;
    readonly veterinarianUserId?: string | null;
    readonly status?: WaitlistEntryStatus | null;
}

/** Alan sınırları backend kuralıyla aynı; doğrusu sunucudadır, burada yalnız form ipucu. */
export const WAITLIST_LIMITS = { note: 500, closeReason: 300, maxRangeDays: 180 } as const;
