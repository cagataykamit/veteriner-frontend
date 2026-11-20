import type { PetAlertsDto } from '@/app/shared/pet-alerts/pet-alerts.utils';
/**
 * Visit (geliş) ve Bugün API DTO'ları — `docs/VISITS_API_CONTRACT.md`. Enum'lar JSON'da string.
 * Yalnızca mapper ve servis kullanır.
 */

export type VisitCareStatusDto = 'Waiting' | 'InProgress' | 'Completed';

export type TodayAppointmentStatusDto = 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow';

export interface VisitDto {
    id: string;
    clinicId: string;
    petId: string;
    appointmentId?: string | null;
    responsibleVeterinarianUserId?: string | null;
    responsibleVeterinarianName?: string | null;
    arrivedAtUtc: string;
    careStatus: VisitCareStatusDto;
    startedAtUtc?: string | null;
    completedAtUtc?: string | null;
    isVoided: boolean;
    isUrgent?: boolean;
    voidReason?: string | null;
    /** Geliş hazırlığı (madde 4.5): resepsiyonun yazdığı geliş nedeni. */
    arrivalReason?: string | null;
    /** Gelişte seçilen şablon / paket; uygulanmaz, hekim muayenede onaylar. */
    preparedExaminationTemplateId?: string | null;
}

export interface VisitCreateResultDto {
    created: boolean;
    visit: VisitDto;
}

export type TodayPaymentIndicatorDto = 'NoPaymentRecorded' | 'PaymentRecorded';

/** Hesaplanan ücret durumu (`OPEN_ITEMS_API_CONTRACT.md` §3); `Charges.Read` yoksa veya planlı satırda alan `null`. */
export type TodayChargeIndicatorDto = 'NoChargeableWork' | 'ChargeMissing' | 'PaymentPending' | 'PartiallyPaid' | 'Paid';

export interface TodayItemDto {
    visitId?: string | null;
    appointmentId?: string | null;
    petId: string;
    petName?: string | null;
    speciesName?: string | null;
    clientId: string;
    clientName?: string | null;
    clientPhone?: string | null;
    scheduledAtUtc?: string | null;
    arrivedAtUtc?: string | null;
    careStatus?: VisitCareStatusDto | null;
    appointmentStatus?: TodayAppointmentStatusDto | null;
    responsibleVeterinarianUserId?: string | null;
    responsibleVeterinarianName?: string | null;
    isCarriedOver: boolean;
    paymentIndicator?: TodayPaymentIndicatorDto | null;
    /** Ziyaret ve müşteri tutarları (`CLIENT_BALANCE_API_CONTRACT.md` §7); `Charges.Read` yoksa hepsi `null`. */
    chargedAmount?: number | null;
    allocatedAmount?: number | null;
    outstandingAmount?: number | null;
    clientOutstandingAmount?: number | null;
    chargeIndicator?: TodayChargeIndicatorDto | null;
    chargeableWorkCount?: number | null;
    awaitingLabCount?: number | null;
    /** Ziyarete bağlı ücret bekleyen kalem sayısı (ADR-018); `Charges.Read` yoksa veya planlı satırda `null`. */
    pendingChargeCount?: number | null;
    hasActiveHospitalization?: boolean | null;
    petAlerts?: PetAlertsDto | null;
    isVoided?: boolean | null;
    isUrgent?: boolean | null;
    voidReason?: string | null;
    /** Randevu nedeni (APPT-005); randevusuz satırda veya nedensiz randevuda `null`. */
    appointmentReasonName?: string | null;
    /** Geliş hazırlığı (madde 4.5); planlı satırda `null`. */
    arrivalReason?: string | null;
    preparedExaminationTemplateId?: string | null;
    /** Şablon sonradan pasifleşse de döner. */
    preparedExaminationTemplateName?: string | null;
    /** Sahip hatırlatma bağlantısıyla geleceğini onayladı (TIER-019); randevusuz satırda `null`. */
    ownerConfirmedAtUtc?: string | null;
    /** Gelişe bağlı en son muayene (`Examinations.Read` yoksa `null`). */
    latestExaminationId?: string | null;
}

/** `TodayHospitalizationDto`: kliniğin tarihten bağımsız aktif yatışları (`VISITS_API_CONTRACT.md`). */
export interface TodayHospitalizationDto {
    hospitalizationId: string;
    petId: string;
    petName?: string | null;
    clientName?: string | null;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
}

/** Klinik geneli açık iş özeti (`OPEN_ITEMS_API_CONTRACT.md` §4); tarih ve hekim süzgecinden bağımsız, alanlar izne göre `null`. */
export interface TodayOpenItemsDto {
    unchargedVisitCount?: number | null;
    outstandingVisitCount?: number | null;
    outstandingAmount?: number | null;
    awaitingLabCount?: number | null;
    incompleteVisitCount: number;
    /** `HBS_ASSISTANT_API_CONTRACT.md` §7: son 30 İstanbul günü; izin yoksa `null`. */
    hbsNotEnteredPrescriptionCount?: number | null;
    hbsNotEnteredVaccinationCount?: number | null;
    /** `OPEN_ITEMS_API_CONTRACT.md` madde 1b: ücrete çevrilmeyi bekleyen kalem sayısı (30 gün); `Charges.Read` yoksa `null`. */
    pendingChargeItemCount?: number | null;
    /** ADR-052 K5: önceki günlerden (30 gün) kalan, hâlâ planlı, gelişi açılmamış randevu; `Appointments.Read` yoksa `null`. */
    overdueAppointmentCount?: number | null;
}

/** `GET /visits/open-items/{kind}` (`OPEN_ITEMS_API_CONTRACT.md` §10). */
export interface OpenItemVisitDto {
    visitId: string;
    arrivedAtUtc: string;
    careStatus: VisitCareStatusDto;
    petId: string;
    petName: string;
    speciesName?: string | null;
    clientId: string;
    clientName: string;
    responsibleVeterinarianUserId?: string | null;
    responsibleVeterinarianName?: string | null;
    latestExaminationId?: string | null;
    chargeableWorkCount?: number | null;
}

export interface OpenItemVisitsDto {
    kind: 'Uncharged' | 'Incomplete';
    totalCount: number;
    items?: OpenItemVisitDto[] | null;
}

export interface TodayDto {
    date: string;
    clinicId: string;
    generatedAtUtc: string;
    items: TodayItemDto[];
    activeHospitalizations?: TodayHospitalizationDto[] | null;
    openItems?: TodayOpenItemsDto | null;
    /** Seçili günün iptal edilen randevuları (liste iptali göstermez); `Appointments.Read` yoksa `null` (`REPORT_HUB_SUMMARY_API_CONTRACT.md` §7.1). */
    cancelledAppointmentCount?: number | null;
}

export interface VeterinarianDto {
    userId: string;
    name?: string | null;
}

export interface CreateVisitRequestDto {
    clinicId?: string;
    petId?: string;
    appointmentId?: string;
    responsibleVeterinarianUserId?: string;
    isUrgent?: boolean;
    arrivalReason?: string;
    preparedExaminationTemplateId?: string;
}

/** `PUT /visits/{id}/preparation`: tam yazım; `null` alan temizler. */
export interface UpdateVisitPreparationRequestDto {
    arrivalReason: string | null;
    preparedExaminationTemplateId: string | null;
}

export interface CorrectVisitRequestDto {
    reason: string;
    targetCareStatus: VisitCareStatusDto | null;
    markAsMistaken: boolean;
}

export interface RestoreVisitRequestDto {
    reason: string;
}

export interface UpdateVisitUrgencyRequestDto {
    isUrgent: boolean;
}
