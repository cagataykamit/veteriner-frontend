import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

export const VITAL_CONCURRENCY_CONFLICT_CODE = 'VitalMeasurements.ConcurrencyConflict';

/** Vital ölçümü — `docs/VITAL_SIGNS_API_CONTRACT.md` §3, §4; `*.Validation` backend `detail` ile gösterilir. */
export const VITAL_MEASUREMENT_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    [VITAL_CONCURRENCY_CONFLICT_CODE]: 'Bu ölçüm siz düzenlerken başka biri tarafından güncellendi.',
    'VitalMeasurements.AlreadyCancelled': 'Bu ölçüm iptal edilmiş.',
    'VitalMeasurements.NotFound': 'Ölçüm bulunamadı.',
    'VitalMeasurements.ValueRequired': 'En az bir değer girin.',
    'VitalMeasurements.MeasuredAtTooFarInPast': 'Ölçüm zamanı en çok 7 gün geriye girilebilir.',
    'VitalMeasurements.MeasuredAtInFuture': 'Ölçüm zamanı ileri bir zaman olamaz.',
    'VitalMeasurements.LateEntryReasonRequired': 'Kesinleşmiş muayeneye eklenen ölçüm için gerekçe yazın.',
    'VitalMeasurements.OutsideHospitalization': 'Ölçüm zamanı yatış süresi içinde olmalı.',
    'VitalMeasurements.HospitalizationPetMismatch': 'Yatış seçilen hastayla uyuşmuyor.',
    'VitalMeasurements.HospitalizationClinicMismatch': 'Yatış aktif klinikte değil.',
    'VitalMeasurements.ExaminationPetMismatch': 'Muayene seçilen hastayla uyuşmuyor.',
    'VitalMeasurements.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'VitalMeasurements.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Hospitalizations.AlreadyCancelled': 'Bu yatış iptal edilmiş.'
};

/** Düzenlemede bağlı muayene kesinleşmişse (409, D7): genel muayene metni yerine bu bağlamın yolu gösterilir. */
export const VITAL_UPDATE_PROBLEM_OVERRIDES: ProblemMessages = {
    'Examinations.Finalized': 'Kesinleşmiş muayeneye bağlı ölçüm düzenlenemez. Düzeltmek için ölçümü iptal edip yeniden girin.'
};
