import type { TodayAppointmentStatusDto, VisitCareStatusDto } from '@/app/features/visits/models/visit-api.model';

export type VisitCareStatus = VisitCareStatusDto;

export type TodayAppointmentStatus = TodayAppointmentStatusDto;

export interface VisitVm {
    id: string;
    clinicId: string;
    petId: string;
    appointmentId: string | null;
    responsibleVeterinarianUserId: string | null;
    responsibleVeterinarianName: string | null;
    arrivedAtUtc: string;
    careStatus: VisitCareStatus;
    isVoided: boolean;
}

export interface VisitCreateResultVm {
    /** `false`: aynı hasta/randevu için açık Visit zaten vardı, yenisi oluşmadı. */
    created: boolean;
    visit: VisitVm;
}

/** Bugün satırı: tek hasta gelişi veya Visit'i olmayan planlı randevu (`visitId` null). */
export interface TodayItemVm {
    /** Liste izleme anahtarı: `visitId`, yoksa `appointmentId`. */
    key: string;
    visitId: string | null;
    appointmentId: string | null;
    petId: string;
    petName: string;
    speciesName: string;
    clientId: string;
    clientName: string;
    clientPhone: string | null;
    scheduledAtUtc: string | null;
    arrivedAtUtc: string | null;
    /** `null`: Visit yok, satır planlı randevu. */
    careStatus: VisitCareStatus | null;
    appointmentStatus: TodayAppointmentStatus | null;
    responsibleVeterinarianName: string | null;
    isCarriedOver: boolean;
}

export interface TodayVm {
    date: string;
    items: TodayItemVm[];
}

export interface VeterinarianVm {
    userId: string;
    name: string;
}

export interface CreateVisitRequest {
    /** Randevulu geliş: `clinicId`/`petId` randevudan türetilir. */
    appointmentId?: string;
    /** Randevusuz geliş: `petId` zorunlu; klinik yoksa aktif klinik bağlamı. */
    petId?: string;
    clinicId?: string;
    responsibleVeterinarianUserId?: string | null;
}

/** Düzeltme hedefi: bir bakım durumu veya "yanlış geliş" işareti. */
export type VisitCorrectionAction = VisitCareStatus | 'Mistaken';

export interface CorrectVisitRequest {
    action: VisitCorrectionAction;
    reason: string;
}
