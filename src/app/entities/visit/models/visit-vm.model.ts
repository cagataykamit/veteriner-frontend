import type { PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';
import type { TodayAppointmentStatusDto, TodayChargeIndicatorDto, VisitCareStatusDto } from '@/app/entities/visit/models/visit-api.model';

export type VisitCareStatus = VisitCareStatusDto;

export type TodayAppointmentStatus = TodayAppointmentStatusDto;

export type TodayChargeIndicator = TodayChargeIndicatorDto;

/** Geliş nedeni üst sınırı (`VISITS_API_CONTRACT.md` §4.5; sunucu da denetler). */
export const VISIT_ARRIVAL_REASON_MAX = 500;

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
    /** Geliş hazırlığı: yeni muayenede şikâyet önerisi olur. */
    arrivalReason: string | null;
    /** Gelişte hazırlanan şablon / paket; uygulanmaz, muayenede öneri olarak sunulur. */
    preparedExaminationTemplateId: string | null;
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
    /** Hesaplanan ücret durumu. `null`: yetki yok veya planlı satır ("yok" anlamına gelmez). */
    chargeIndicator: TodayChargeIndicator | null;
    /** `null`: yetki yok veya planlı satır. */
    chargeableWorkCount: number | null;
    /** Bekleyen (istenmiş, sonuçsuz) lab sayısı. `null`: yetki yok veya planlı satır. */
    awaitingLabCount: number | null;
    /** Ücret bekleyen kalem sayısı. `null`: yetki yok veya planlı satır. `> 0` iken "Ücret yok" gösterilmez. */
    pendingChargeCount: number | null;
    hasActiveHospitalization: boolean;
    /** Yalnızca "Yanlış işaretlenenler" görünümünde `true`. */
    isVoided: boolean;
    voidReason: string | null;
    petAlerts: PetAlertsVm;
    isUrgent: boolean;
    /** Randevu nedeni; randevusuz satırda veya nedensiz randevuda `null`. Geliş diyaloğunda geliş nedenine önerilir. */
    appointmentReasonName: string | null;
    /** Geliş hazırlığı (yalnız Visit satırı). */
    arrivalReason: string | null;
    preparedExaminationTemplateId: string | null;
    /** Şablon sonradan pasifleşse de dolu gelir. */
    preparedExaminationTemplateName: string | null;
    /** Sahip hatırlatma bağlantısıyla geleceğini onayladı (TIER-019); durum değişmez, satırda rozet. */
    ownerConfirmedAtUtc: string | null;
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

/** Bugün üstü açık iş özeti; her alan `null` olabilir (ilgili okuma izni yok). */
export interface TodayOpenItemsVm {
    unchargedVisitCount: number | null;
    outstandingVisitCount: number | null;
    outstandingAmount: number | null;
    awaitingLabCount: number | null;
    incompleteVisitCount: number;
    /** "HBS'e girilmedi" reçete sayısı (son 30 gün); `Prescriptions.Read` yoksa veya gün sonunda `null`. */
    hbsNotEnteredPrescriptionCount?: number | null;
    /** "HBS'e girilmedi" aşı sayısı (son 30 gün); `Vaccinations.Read` yoksa veya gün sonunda `null`. */
    hbsNotEnteredVaccinationCount?: number | null;
}

export interface TodayVm {
    date: string;
    items: TodayItemVm[];
    activeHospitalizations: TodayHospitalizationVm[];
    /** `null`: özet yok (yanlış işaretlenenler görünümü). */
    openItems?: TodayOpenItemsVm | null;
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
    /** Hazırlık yalnız yeni kayıtta uygulanır; mevcut açık geliş dönerse değişmez (sonradan `setPreparation`). */
    arrivalReason?: string | null;
    preparedExaminationTemplateId?: string | null;
}

/** Geliş hazırlığı tam yazımı: boş alan temizler. */
export interface VisitPreparationRequest {
    arrivalReason: string | null;
    preparedExaminationTemplateId: string | null;
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
