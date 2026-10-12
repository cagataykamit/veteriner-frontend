import type { PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';
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
    /** Bu ziyaretin ücret / tahsis / kalan tutarı. `null`: `Charges.Read` yok veya ziyaret yok (planlı randevu). */
    chargedAmount: number | null;
    allocatedAmount: number | null;
    outstandingAmount: number | null;
    /** Müşterinin bu klinikteki toplam açık borcu (ziyaretten bağımsız). `null`: `Charges.Read` yok. */
    clientOutstandingAmount: number | null;
    hasActiveHospitalization: boolean;
    /** Yalnızca "Yanlış işaretlenenler" görünümünde `true`. */
    isVoided: boolean;
    voidReason: string | null;
    petAlerts: PetAlertsVm;
    isUrgent: boolean;
}

/** Bugün'deki aktif yatış satırı; `items` içine karışmaz, sorumlu hekim süzgecinden etkilenmez. */
export interface TodayHospitalizationVm {
    hospitalizationId: string;
    petId: string;
    petName: string;
    clientName: string;
    admittedAtUtc: string;
    plannedDischargeAtUtc: string | null;
}

export interface TodayVm {
    date: string;
    items: TodayItemVm[];
    activeHospitalizations: TodayHospitalizationVm[];
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
