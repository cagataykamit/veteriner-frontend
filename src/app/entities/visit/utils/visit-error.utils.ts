import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Geliş (Visit), Bugün ve randevu durum geçişleri (Gelmedi) — `ProblemDetails` + `extensions.code`; `Visits.Validation` backend `detail` ile gösterilir. */
export const VISIT_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'Visits.NotFound': 'Geliş kaydı bulunamadı veya artık kuyrukta değil. Listeyi yenileyin.',
    'Visits.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Visits.ClinicScopeRequired': 'Bugün listesi için önce bir klinik seçmelisiniz.',
    'Visits.AppointmentPetClinicMismatch': 'Randevu, seçilen hasta veya klinikle uyuşmuyor.',
    'Visits.AppointmentCancelled': 'İptal edilmiş randevu için geliş kaydı açılamaz.',
    'Visits.AppointmentNotScheduled': 'Bu randevu zaten tamamlanmış; geliş kaydı açılamaz.',
    'Visits.InvalidStatusTransition': 'Bu geçiş yapılamaz; durum başka biri tarafından değişmiş olabilir. Listeyi yenileyin.',
    'Visits.HasExaminations': 'Muayenesi olan geliş yanlış geliş olarak işaretlenemez.',
    'Visits.TodayLimitExceeded': 'Bugün listesi sınırı aşıldı; tüm kayıtlar gösterilemiyor.',
    'Visits.DuplicateActiveVisit': 'Bu hastanın başka açık geliş kaydı var; bu işlem ikinci bir açık kayıt oluşturacağı için yapılamaz.',
    'Visits.DuplicateAppointmentVisit': 'Bu randevu için başka geliş kaydı var; geri alınamaz.',
    'Visits.NotOpen': 'Bu geliş tamamlanmış veya yanlış geliş olarak işaretlenmiş; muayene açılamaz.',
    'Visits.ConcurrencyConflict': 'Kayıt aynı anda başka biri tarafından güncellendi. Listeyi yenileyip tekrar deneyin.',
    'Examinations.VisitMismatch': 'Muayene, geliş kaydındaki hasta veya randevuyla uyuşmuyor.',
    'Examinations.AppointmentNoShow': 'Gelmedi işaretli randevuya doğrudan muayene açılamaz. Hasta geldiyse önce geliş kaydı açın veya gelmedi işaretini geri alın.',
    'Appointments.ScheduledTooFarInPast': 'Randevu zamanı çok eski; en fazla 7 gün öncesine kadar kayıt açılabilir.',
    'Appointments.ScheduledTooFarInFuture': 'Randevu zamanı en fazla 2 yıl ileriye planlanabilir.',
    'Appointments.NoShowNotYetDue': 'Randevu saati henüz gelmedi; gelmedi olarak işaretlenemez.',
    'Appointments.HasVisit': 'Bu randevu için geliş kaydı var (hasta gelmiş); gelmedi olarak işaretlenemez.',
    'Appointments.InvalidStatusTransition': 'Randevu durumu bu işleme uygun değil; durum başka biri tarafından değişmiş olabilir. Sayfayı yenileyip tekrar deneyin.',
    /** Yeni randevu, geliş ve muayene kapısı (`PET_STATUS_CLIENT_CONTACT_API_CONTRACT.md` §1). */
    'Pets.Deceased': 'Bu hasta vefat etti olarak işaretli; yeni randevu, geliş veya muayene açılamaz. Yanlış işaretlendiyse hasta kartından "Aktife al" ile geri alın.',
    'Pets.ConcurrencyConflict': 'Hasta kaydı aynı anda başka biri tarafından değiştirildi. Güncel bilgiyi yükleyip tekrar deneyin.',
    /** Rıza işareti ve tam müşteri güncellemesi (`KVKK_CONSENT_API_CONTRACT.md` §1). */
    'Clients.ConcurrencyConflict': 'Müşteri kaydı aynı anda başka biri tarafından değiştirildi. Güncel bilgiyi yükleyip tekrar deneyin.'
};
