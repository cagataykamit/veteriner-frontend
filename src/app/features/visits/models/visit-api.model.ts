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
    hasActiveHospitalization?: boolean | null;
    petAlerts?: PetAlertsDto | null;
    isVoided?: boolean | null;
    isUrgent?: boolean | null;
    voidReason?: string | null;
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
}

export interface TodayDto {
    date: string;
    clinicId: string;
    generatedAtUtc: string;
    items: TodayItemDto[];
    activeHospitalizations?: TodayHospitalizationDto[] | null;
    openItems?: TodayOpenItemsDto | null;
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
