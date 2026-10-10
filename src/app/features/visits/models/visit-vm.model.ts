import type { TodayAppointmentStatusDto, TodayPaymentIndicatorDto, VisitCareStatusDto } from '@/app/features/visits/models/visit-api.model';

export type VisitCareStatus = VisitCareStatusDto;

export type TodayAppointmentStatus = TodayAppointmentStatusDto;

/** Yalnızca tahsilat kaydının varlığını söyler; borç/bakiye değildir ve bakım durumunu etkilemez. */
export type TodayPaymentIndicator = TodayPaymentIndicatorDto;

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
    isUrgent: boolean;
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
    paymentIndicator: TodayPaymentIndicator;
    hasActiveHospitalization: boolean;
    /** Yalnızca "Yanlış işaretlenenler" görünümünde `true`. */
    isVoided: boolean;
    voidReason: string | null;
    isUrgent: boolean;
}

export interface TodayVm {
    date: string;
    items: TodayItemVm[];
}

export interface VeterinarianVm {
    userId: string;
    name: string;
}

/** Hasta arama sonucu / yeni kaydedilen hasta: sahip bilgisiyle ayırt edilebilir etiket. */
export interface PetSuggestion {
    id: string;
    label: string;
    /** Aynı sahibe yeni hayvan eklemek için; liste yanıtında yoksa `null`. */
    clientId: string | null;
    clientName: string;
}

export interface CreateVisitRequest {
    /** Randevulu geliş: `clinicId`/`petId` randevudan türetilir. */
    appointmentId?: string;
    /** Randevusuz geliş: `petId` zorunlu; klinik yoksa aktif klinik bağlamı. */
    petId?: string;
    clinicId?: string;
    responsibleVeterinarianUserId?: string | null;
    isUrgent?: boolean;
}

/** Düzeltme hedefi: bir bakım durumu veya "yanlış geliş" işareti. */
export type VisitCorrectionAction = VisitCareStatus | 'Mistaken';

export interface CorrectVisitRequest {
    action: VisitCorrectionAction;
    reason: string;
}

/** `GET /visits/today` sorgusu: varsayılan normal kuyruk; `voided` yanlış işaretlenenleri getirir. */
export interface TodayQuery {
    voided?: boolean;
    /** "Benim hastalarım": yalnızca bu kullanıcının sorumlu olduğu Visit satırları (kullanıcı klinikte aktif hekim olmalı). */
    responsibleVeterinarianUserId?: string;
}
