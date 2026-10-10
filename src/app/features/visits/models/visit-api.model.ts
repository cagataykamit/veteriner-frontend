/**
 * Visit (geliş) ve Bugün API DTO'ları — `docs/VISITS_API_CONTRACT.md`. Enum'lar JSON'da string.
 * Yalnızca mapper ve servis kullanır.
 */

export type VisitCareStatusDto = 'Waiting' | 'InProgress' | 'Completed';

export type TodayAppointmentStatusDto = 'Scheduled' | 'Completed' | 'Cancelled';

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
    voidReason?: string | null;
}

export interface VisitCreateResultDto {
    created: boolean;
    visit: VisitDto;
}

export type TodayPaymentIndicatorDto = 'NoPaymentRecorded' | 'PaymentRecorded';

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
    hasActiveHospitalization?: boolean | null;
}

export interface TodayDto {
    date: string;
    clinicId: string;
    generatedAtUtc: string;
    items: TodayItemDto[];
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
}

export interface CorrectVisitRequestDto {
    reason: string;
    targetCareStatus: VisitCareStatusDto | null;
    markAsMistaken: boolean;
}
