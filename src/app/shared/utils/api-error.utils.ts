import { HttpErrorResponse } from '@angular/common/http';
import { catchError, MonoTypeOperatorFunction, throwError } from 'rxjs';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';

/** Sunucunun genel ProblemDetails başlıkları / Angular transport metni — kullanıcıya göstermek için yetersiz. */
export function isUnhelpfulProblemText(s: string): boolean {
    const t = s.trim();
    if (!t) {
        return true;
    }
    if (/^http failure response for /i.test(t)) {
        return true;
    }
    if (/^İstek\s+işlenemedi\.?$/iu.test(t)) {
        return true;
    }
    if (/^İstek\s+başarısız\.?$/iu.test(t)) {
        return true;
    }
    if (/one or more validation errors occurred/i.test(t)) {
        return true;
    }
    if (/^validation failed/i.test(t)) {
        return true;
    }
    if (/^bad request$/i.test(t)) {
        return true;
    }
    return false;
}

/** 429 Too Many Requests — Retry-After varsa saniye ile, yoksa kısa genel metin. */
export function rateLimitUserMessage(err: HttpErrorResponse): string {
    const retryAfter = err.headers.get('Retry-After');
    const sec = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
    if (!Number.isNaN(sec) && sec > 0) {
        return `Çok fazla istek gönderildi. Lütfen ${sec} saniye sonra tekrar deneyin.`;
    }
    return 'Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.';
}

/** Kiracıda abonelik yok / yazma engeli — create (müşteri, hayvan, …) sırasında backend `detail` veya `extensions.code`. */
const SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE =
    'Kurum aboneliği bulunamadığı için yeni kayıt oluşturulamıyor. Hesap → Abonelik bölümünden paketinizi etkinleştirebilirsiniz; bu sayfaya erişiminiz yoksa kurum yöneticinizle iletişime geçin.';

/** Abonelik / tenant yazma kilidi — backend `ProblemDetails` + `extensions.code`. */
const SUBSCRIPTION_WRITE_USER_MESSAGES: Record<string, string> = {
    'Subscriptions.TenantReadOnly':
        'Kurum aboneliği salt okunur durumda. Yeni kayıt oluşturmak için aboneliğinizi yenileyin. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    'Subscriptions.TenantCancelled':
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.',
    'Subscriptions.NotFound': SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    /** Kiracı bağlamında abonelik satırı yok (yazma guard) — müşteri oluşturma vb. */
    'Subscriptions.TenantSubscriptionNotFound': SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    SubscriptionsTenantSubscriptionNotFound: SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    /** Alternatif backend adlandırması */
    'Tenants.SubscriptionMissing': SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    TenantsSubscriptionMissing: SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    'Tenants.TenantSubscriptionNotFound': SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    TenantsTenantSubscriptionNotFound: SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE,
    'Subscriptions.PlanCodeInvalid': 'Seçilen paket kodu geçerli değil.',
    'Subscriptions.SamePlanAlreadyActive': 'Bu paket zaten aktif görünüyor; farklı bir paket seçin.',
    'Subscriptions.DowngradeMustBeScheduled': 'Bu paket düşürme işlemi dönem sonuna planlanmalıdır.',
    'Subscriptions.UpgradeRequiresCheckout': 'Yükseltme işlemi için ödeme adımını tamamlamanız gerekiyor.',
    'Subscriptions.CheckoutSessionNotOpen': 'Checkout oturumu artık açık değil. Lütfen yeniden başlatın.',
    'Subscriptions.CheckoutSessionNotFound': 'Checkout oturumu bulunamadı; işlemi yeniden başlatın.',
    'Subscriptions.PendingPlanChangeNotFound': 'Bekleyen plan değişikliği bulunamadı.',
    'Subscriptions.PendingPlanChangeNotCancelable': 'Bekleyen plan değişikliği artık iptal edilemiyor.',
    'Subscriptions.DowngradeScheduleConflict': 'Bu plan geçişi şu an planlanamıyor. Özet bilgiyi yenileyip tekrar deneyin.',
    'Billing.PlanPriceNotConfigured':
        'Bu paket için ödeme yapılandırması tamamlanmamış. Lütfen daha sonra tekrar deneyin veya yöneticinizle iletişime geçin.',
    'Subscriptions.UpgradePriceDiffInvalid': 'Paket yükseltme tutarı hesaplanamadı. Lütfen daha sonra tekrar deneyin.'
};

/** ProblemDetails / extensions üzerinden ham problem kodu (test ve rapor toparlama için). */
export function problemCodeFromHttpError(err: HttpErrorResponse): string | null {
    return readProblemCodeFromHttp(err);
}

function readProblemCodeFromHttp(err: HttpErrorResponse): string | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const ext =
        o['extensions'] && typeof o['extensions'] === 'object' && !Array.isArray(o['extensions'])
            ? (o['extensions'] as Record<string, unknown>)
            : null;
    const pickExt = (key: string): string | null => {
        if (!ext) {
            return null;
        }
        const v = ext[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    };
    const code =
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        pickExt('code');
    return code ?? null;
}

/** Kiracı ayarları / kurum adı güncelleme vb. — `ProblemDetails` + `extensions.code`. */
const TENANT_ORGANIZATION_PROBLEM_MESSAGES: Record<string, string> = {
    'Tenants.AccessDenied': 'Bu kuruma erişim yetkiniz bulunmuyor.',
    TenantsAccessDenied: 'Bu kuruma erişim yetkiniz bulunmuyor.',
    'Tenants.NotFound': 'Kurum kaydı bulunamadı veya artık erişilemiyor.',
    TenantsNotFound: 'Kurum kaydı bulunamadı veya artık erişilemiyor.',
    'Tenants.DuplicateName': 'Bu kurum adı zaten kullanılıyor. Lütfen farklı bir ad deneyin.',
    TenantsDuplicateName: 'Bu kurum adı zaten kullanılıyor. Lütfen farklı bir ad deneyin.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok.',
    AuthPermissionDenied: 'Bu işlem için yetkiniz yok.'
};

function tenantOrganizationProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (!code) {
        return null;
    }
    return TENANT_ORGANIZATION_PROBLEM_MESSAGES[code] ?? TENANT_ORGANIZATION_PROBLEM_MESSAGES[code.replace(/\./g, '')] ?? null;
}

/** Klinik oluşturma / panel klinik yazma — `ProblemDetails` + `extensions.code`. */
const CLINIC_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Context.ClinicConflict':
        'Stok bilgileri aktif klinik bağlamıyla uyuşmadığı için yüklenemedi. Lütfen sayfayı yenileyin veya aktif kliniği kontrol edin.',
    ContextClinicConflict:
        'Stok bilgileri aktif klinik bağlamıyla uyuşmadığı için yüklenemedi. Lütfen sayfayı yenileyin veya aktif kliniği kontrol edin.',
    'Clinics.AccessDenied': 'Bu kliniğe erişim yetkiniz yok.',
    ClinicsAccessDenied: 'Bu kliniğe erişim yetkiniz yok.',
    'Clinics.DuplicateName': 'Bu isimde bir klinik zaten kayıtlı. Lütfen farklı bir klinik adı kullanın.',
    ClinicsDuplicateName: 'Bu isimde bir klinik zaten kayıtlı. Lütfen farklı bir klinik adı kullanın.',
    'Tenants.ContextMissing':
        'Kurum bağlamı bulunamadı. Sayfayı yenileyip tekrar deneyin veya oturumu kapatıp yeniden giriş yapın.',
    TenantsContextMissing:
        'Kurum bağlamı bulunamadı. Sayfayı yenileyip tekrar deneyin veya oturumu kapatıp yeniden giriş yapın.',
    'Tenants.TenantInactive': 'Bu kurum şu anda aktif değil; klinik eklenemiyor.',
    TenantsTenantInactive: 'Bu kurum şu anda aktif değil; klinik eklenemiyor.'
};

function clinicPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (!code) {
        return null;
    }
    return CLINIC_PANEL_PROBLEM_MESSAGES[code] ?? CLINIC_PANEL_PROBLEM_MESSAGES[code.replace(/\./g, '')] ?? null;
}

/** Hatırlatma ayarları / geçmiş — `ProblemDetails` + `extensions.code`. */
const REMINDER_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Reminders.AccessDenied': 'Bu hatırlatma kayıtlarına erişim yetkiniz yok.',
    RemindersAccessDenied: 'Bu hatırlatma kayıtlarına erişim yetkiniz yok.'
};

function reminderPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (!code) {
        return null;
    }
    return REMINDER_PANEL_PROBLEM_MESSAGES[code] ?? REMINDER_PANEL_PROBLEM_MESSAGES[code.replace(/\./g, '')] ?? null;
}

/** Aşı oluşturma / güncelleme — `ProblemDetails` + `extensions.code`. */
const VACCINATION_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Vaccinations.ScheduledRequiresDueAt': 'Planlanan durumda planlanan uygulama tarihi zorunludur.',
    VaccinationsScheduledRequiresDueAt: 'Planlanan durumda planlanan uygulama tarihi zorunludur.',
    'Vaccinations.ScheduledDueAtMustNotBePast': 'Planlanan uygulama tarihi ve saati gelecekte olmalıdır.',
    VaccinationsScheduledDueAtMustNotBePast: 'Planlanan uygulama tarihi ve saati gelecekte olmalıdır.',
    'Vaccinations.AppliedAtMustNotBeFuture': 'Uygulama tarihi gelecek bir tarih olamaz.',
    VaccinationsAppliedAtMustNotBeFuture: 'Uygulama tarihi gelecek bir tarih olamaz.',
    'Vaccinations.DueAtMustBeAfterAppliedAt': 'Sonraki uygulama tarihi, uygulama tarihinden sonra olmalıdır.',
    VaccinationsDueAtMustBeAfterAppliedAt: 'Sonraki uygulama tarihi, uygulama tarihinden sonra olmalıdır.',
    'Vaccinations.ScheduledMustNotHaveAppliedAt': 'Planlanan kayıtta uygulama tarihi bulunmamalıdır.',
    VaccinationsScheduledMustNotHaveAppliedAt: 'Planlanan kayıtta uygulama tarihi bulunmamalıdır.',
    'VaccineDefinitions.NotFound': 'Seçilen aşı tanımı bulunamadı.',
    VaccineDefinitionsNotFound: 'Seçilen aşı tanımı bulunamadı.',
    'VaccineDefinitions.Inactive': 'Seçilen aşı tanımı aktif değil.',
    VaccineDefinitionsInactive: 'Seçilen aşı tanımı aktif değil.',
    'VaccineDefinitions.InvalidSpecies': 'Seçilen aşı tanımı bu hayvan türüyle uyumlu değil.',
    VaccineDefinitionsInvalidSpecies: 'Seçilen aşı tanımı bu hayvan türüyle uyumlu değil.',
    'VaccineDefinitions.CoreDefinitionCannotBeModified': 'Sistem tanımlı aşı kayıtları düzenlenemez.',
    VaccineDefinitionsCoreDefinitionCannotBeModified: 'Sistem tanımlı aşı kayıtları düzenlenemez.',
    'VaccineDefinitions.DuplicateCode': 'Bu aşı kodu zaten kullanılıyor.',
    VaccineDefinitionsDuplicateCode: 'Bu aşı kodu zaten kullanılıyor.'
};

function vaccinationPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (!code) {
        return null;
    }
    return VACCINATION_PANEL_PROBLEM_MESSAGES[code] ?? VACCINATION_PANEL_PROBLEM_MESSAGES[code.replace(/\./g, '')] ?? null;
}

/** Geliş (Visit), Bugün ve randevu durum geçişleri (Gelmedi) — `ProblemDetails` + `extensions.code`; `Visits.Validation` backend `detail` ile gösterilir. */
const VISIT_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Visits.NotFound': 'Geliş kaydı bulunamadı veya artık kuyrukta değil. Listeyi yenileyin.',
    'Visits.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Visits.ClinicScopeRequired': 'Bugün listesi için önce bir klinik seçmelisiniz.',
    'Visits.AppointmentPetClinicMismatch': 'Randevu, seçilen hayvan veya klinikle uyuşmuyor.',
    'Visits.AppointmentCancelled': 'İptal edilmiş randevu için geliş kaydı açılamaz.',
    'Visits.AppointmentNotScheduled': 'Bu randevu zaten tamamlanmış; geliş kaydı açılamaz.',
    'Visits.InvalidStatusTransition': 'Bu geçiş yapılamaz; durum başka biri tarafından değişmiş olabilir. Listeyi yenileyin.',
    'Visits.HasExaminations': 'Muayenesi olan geliş yanlış geliş olarak işaretlenemez.',
    'Visits.TodayLimitExceeded': 'Bugün listesi sınırı aşıldı; tüm kayıtlar gösterilemiyor.',
    'Visits.DuplicateActiveVisit': 'Bu hayvanın başka açık geliş kaydı var; bu işlem ikinci bir açık kayıt oluşturacağı için yapılamaz.',
    'Visits.DuplicateAppointmentVisit': 'Bu randevu için başka geliş kaydı var; geri alınamaz.',
    'Visits.NotOpen': 'Bu geliş tamamlanmış veya yanlış geliş olarak işaretlenmiş; muayene açılamaz.',
    'Visits.ConcurrencyConflict': 'Kayıt aynı anda başka biri tarafından güncellendi. Listeyi yenileyip tekrar deneyin.',
    'Examinations.VisitMismatch': 'Muayene, geliş kaydındaki hayvan veya randevuyla uyuşmuyor.',
    'Examinations.AppointmentNoShow': 'Gelmedi işaretli randevuya doğrudan muayene açılamaz. Hasta geldiyse önce geliş kaydı açın veya gelmedi işaretini geri alın.',
    'Appointments.ScheduledTooFarInPast': 'Randevu zamanı çok eski; en fazla 7 gün öncesine kadar kayıt açılabilir.',
    'Appointments.ScheduledTooFarInFuture': 'Randevu zamanı en fazla 2 yıl ileriye planlanabilir.',
    'Appointments.NoShowNotYetDue': 'Randevu saati henüz gelmedi; gelmedi olarak işaretlenemez.',
    'Appointments.HasVisit': 'Bu randevu için geliş kaydı var (hasta gelmiş); gelmedi olarak işaretlenemez.',
    'Appointments.InvalidStatusTransition': 'Randevu durumu bu işleme uygun değil; durum başka biri tarafından değişmiş olabilir. Sayfayı yenileyip tekrar deneyin.'
};

function visitPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (VISIT_PANEL_PROBLEM_MESSAGES[code] ?? null) : null;
}

/** Ücret (Charge) ve ödeme iptali — `docs/CHARGES_API_CONTRACT.md` §6, `FINANCE_CORRECTION_API_CONTRACT.md` §8; `*.Validation` backend `detail` ile gösterilir. */
const CHARGE_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Charges.NotFound': 'Ücret kaydı bulunamadı.',
    'Charges.ClinicScopeRequired': 'Ücretleri görmek için önce bir klinik seçmelisiniz.',
    'Charges.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Clients.NotFound': 'Müşteri kaydı bulunamadı.',
    'Pets.NotFound': 'Hayvan kaydı bulunamadı.',
    'Examinations.NotFound': 'Muayene kaydı bulunamadı.',
    'Charges.PetClientMismatch': 'Seçilen hayvan bu müşteriye ait değil.',
    'Charges.VisitVoided': 'Yanlış olarak işaretlenmiş bir geliş kaydına ücret bağlanamaz.',
    'Charges.VisitClinicMismatch': 'Geliş kaydı aktif klinikte değil.',
    'Charges.VisitClientMismatch': 'Geliş kaydındaki hayvan bu müşteriye ait değil.',
    'Charges.VisitPetMismatch': 'Geliş kaydı seçilen hayvanla uyuşmuyor.',
    'Charges.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'Charges.ExaminationClientMismatch': 'Muayenedeki hayvan bu müşteriye ait değil.',
    'Charges.ExaminationPetMismatch': 'Muayene seçilen hayvanla uyuşmuyor.',
    'Charges.ExaminationVisitMismatch': 'Muayene, seçilen geliş kaydına bağlı değil.',
    'Charges.VoidBlockedByAllocation': 'Bu ücrete ödeme bağlı olduğu için iptal edilemez. Önce ilgili ödemeyi iptal edin.',
    'Charges.CorrectionBelowAllocated': 'Yeni tutar, bu ücrete bağlı ödemelerin toplamının altında olamaz. Önce ilgili ödemeyi iptal edin veya daha yüksek bir tutar girin.',
    'Charges.AlreadyVoided': 'Bu ücret zaten iptal edilmiş. Listeyi yenileyin.',
    'Charges.RequestIdVoided': 'Bu ücret kaydı iptal edilmişti. Formu yeniden açıp tekrar deneyin.',
    'Charges.ConcurrencyConflict': 'Ücret aynı anda başka biri tarafından değiştirildi. Listeyi yenileyip tekrar deneyin.',
    'Payments.NotFound': 'Ödeme kaydı bulunamadı veya iptal edilmiş.',
    'Payments.AlreadyVoided': 'Bu ödeme zaten iptal edilmiş. Listeyi yenileyin.',
    'Payments.RequestIdVoided': 'Bu ödeme kaydı iptal edilmişti. Formu yeniden açıp tekrar deneyin.',
    'Payments.ConcurrencyConflict': 'Ödeme aynı anda başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.'
};

function chargePanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (CHARGE_PANEL_PROBLEM_MESSAGES[code] ?? null) : null;
}

/** Muayene kesinleştirme / ek not — `ProblemDetails` + `extensions.code` (`docs/EXAMINATION_FINALIZE_API_CONTRACT.md`). */
const EXAMINATION_FINALIZE_PROBLEM_MESSAGES: Record<string, string> = {
    'Examinations.AlreadyFinalized': 'Bu muayene zaten kesinleştirilmiş. Sayfayı yenileyin.',
    'Examinations.ConcurrencyConflict':
        'Muayene siz ekranı açtıktan sonra başka biri tarafından değiştirilmiş. Sayfayı yenileyip içeriği kontrol ederek tekrar deneyin.',
    'Examinations.Finalized': 'Bu muayene kesinleştirilmiş; bağlı kayıt eklenemez veya değiştirilemez. Gerekirse muayeneye ek not ekleyin.',
    'Examinations.NotFinalized': 'Ek not yalnızca kesinleşmiş muayeneye eklenebilir.',
    'Examinations.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Examinations.NotFound': 'Muayene bulunamadı veya artık erişilemiyor.'
};

function examinationFinalizeProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (EXAMINATION_FINALIZE_PROBLEM_MESSAGES[code] ?? null) : null;
}

/** Lab istem/sonuç durumu — `docs/LAB_RESULT_STATUS_API_CONTRACT.md` §5; `LabResults.Validation` backend `detail` ile gösterilir. */
const LAB_RESULT_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'LabResults.ConcurrencyConflict': 'Bu lab kaydı siz düzenlerken başka biri tarafından güncellendi.',
    'LabResults.AlreadyCancelled': 'Bu lab kaydı zaten iptal edilmiş. Sayfayı yenileyin.',
    'LabResults.VisitPetMismatch': 'Geliş kaydı seçilen hayvanla uyuşmuyor.',
    'LabResults.VisitClinicMismatch': 'Geliş kaydı aktif klinikte değil.',
    'LabResults.ExaminationVisitMismatch': 'Muayene, geliş kaydına bağlı değil.'
};

function labResultPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (LAB_RESULT_PANEL_PROBLEM_MESSAGES[code] ?? null) : null;
}

/** Yatış ve bakım talimatı — `docs/HOSPITALIZATION_MODEL_API_CONTRACT.md` §2, §4, §6, §8; `*.Validation` backend `detail` ile gösterilir. */
const HOSPITALIZATION_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Hospitalizations.ConcurrencyConflict': 'Bu yatış kaydı siz düzenlerken başka biri tarafından güncellendi.',
    'Hospitalizations.ExaminationVisitMismatch': 'Seçilen geliş, bağlı muayenenin gelişiyle uyuşmuyor.',
    'Hospitalizations.VisitPetMismatch': 'Geliş kaydı seçilen hayvanla uyuşmuyor.',
    'Hospitalizations.VisitClinicMismatch': 'Geliş kaydı aktif klinikte değil.',
    'CareInstructions.ConcurrencyConflict': 'Bu bakım talimatı siz düzenlerken başka biri tarafından güncellendi.',
    'CareInstructions.HospitalizationPetMismatch': 'Yatış seçilen hayvanla uyuşmuyor.',
    'CareInstructions.HospitalizationClinicMismatch': 'Yatış aktif klinikte değil.',
    'CareInstructions.ExaminationPetMismatch': 'Muayene seçilen hayvanla uyuşmuyor.',
    'CareInstructions.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'CareInstructions.HospitalizationExaminationMismatch': 'Muayene, yatışın bağlı olduğu muayeneyle uyuşmuyor.',
    'CareInstructions.VisitMismatch': 'Geliş kaydı, yatışın gelişiyle uyuşmuyor.',
    'CareInstructions.ExaminationVisitMismatch': 'Geliş kaydı, muayenenin gelişiyle uyuşmuyor.',
    'Hospitalizations.NotFound': 'Yatış kaydı bulunamadı.',
    'CareInstructions.NotFound': 'Bakım talimatı bulunamadı.'
};

function hospitalizationPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (HOSPITALIZATION_PANEL_PROBLEM_MESSAGES[code] ?? null) : null;
}

/** Uygulama kaydı ve iptali — `docs/ADMINISTRATIONS_API_CONTRACT.md` §3–§6; `Administrations.Validation` backend `detail` ile gösterilir. */
const ADMINISTRATION_PANEL_PROBLEM_MESSAGES: Record<string, string> = {
    'Administrations.InsufficientStock': 'Bu ürünün klinik stoğu yetersiz; uygulama kaydedilmedi. Önce stok girişi yapın veya miktarı düşürün.',
    'Administrations.DuplicateRequestId': 'Bu istek kimliği farklı bir uygulama için kullanılmış. Formu yeniden açıp tekrar deneyin.',
    'Administrations.RequestIdVoided': 'Bu uygulama kaydı iptal edilmişti. Formu yeniden açıp tekrar deneyin.',
    'Administrations.AlreadyVoided': 'Bu uygulama zaten iptal edilmiş. Listeyi yenileyin.',
    'Administrations.LateEntryReasonRequired': 'Muayene kesinleşmiş; gerekçe (5–500 karakter) zorunludur. Uygulamayı muayene sayfasından ekleyin.',
    'Administrations.NotFound': 'Uygulama kaydı bulunamadı.',
    'Administrations.StockMovementNotFound': 'Uygulamanın stok hareketi bulunamadı; lütfen destek ile iletişime geçin.',
    'Administrations.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Administrations.ClinicScopeRequired': 'Uygulamaları görmek için önce bir klinik seçmelisiniz.',
    'Administrations.TreatmentClinicMismatch': 'Tedavi aktif klinikte değil.',
    'Administrations.TreatmentPetMismatch': 'Tedavi seçilen hayvanla uyuşmuyor.',
    'Administrations.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'Administrations.ExaminationPetMismatch': 'Muayene seçilen hayvanla uyuşmuyor.',
    'Administrations.TreatmentExaminationMismatch': 'Tedavi, seçilen muayeneye bağlı değil.',
    'Treatments.DateTooFarInPast': 'Uygulama zamanı en fazla 7 gün öncesine kadar girilebilir.',
    'Treatments.DateTooFarInFuture': 'Uygulama zamanı en fazla 2 yıl ileriye girilebilir.',
    'Products.NotFound': 'Ürün bulunamadı.',
    'Products.Inactive': 'Bu ürün pasif; kullanılamaz. Başka bir ürün seçin veya ürünü aktifleştirin.',
    'StockMovements.ConcurrencyConflict': 'Stok aynı anda başka bir işlemle değişti. Tekrar deneyin; aynı kayıt iki kez düşülmez.'
};

function administrationPanelProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    return code ? (ADMINISTRATION_PANEL_PROBLEM_MESSAGES[code] ?? null) : null;
}

function lookupSubscriptionWriteMessageByCode(code: string): string | null {
    const t = code.trim();
    if (!t) {
        return null;
    }
    const direct = SUBSCRIPTION_WRITE_USER_MESSAGES[t];
    if (direct) {
        return direct;
    }
    const needle = t.replace(/\./g, '');
    for (const [k, v] of Object.entries(SUBSCRIPTION_WRITE_USER_MESSAGES)) {
        if (k.replace(/\./g, '') === needle) {
            return v;
        }
    }
    return null;
}

/**
 * Kod yoksa bile: backend yalnızca Türkçe `detail` döndüğünde (ör. “Bu kiracı için abonelik kaydı bulunamadı.”)
 * yazma guard mesajını üret.
 */
function subscriptionMissingFromProblemBody(err: HttpErrorResponse): string | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const detail =
        typeof o['detail'] === 'string' ? o['detail'] : typeof o['Detail'] === 'string' ? o['Detail'] : '';
    const title =
        typeof o['title'] === 'string' ? o['title'] : typeof o['Title'] === 'string' ? o['Title'] : '';
    const blob = `${detail}\n${title}`.toLocaleLowerCase('tr-TR');
    if (!blob.trim()) {
        return null;
    }
    if (/abonelik\s+kayd[ıi]\s+bulunamad[ıi]/.test(blob)) {
        return SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE;
    }
    if (/kirac[ıi]\s+için\s+abonelik/.test(blob) && /bulunamad[ıi]/.test(blob)) {
        return SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE;
    }
    if (/abonelik\s+kayd[ıi].*bulunamad[ıi]/.test(blob) && /kirac[ıi]/.test(blob)) {
        return SUBSCRIPTION_TENANT_MISSING_GUARD_MESSAGE;
    }
    return null;
}

function subscriptionWriteUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (code) {
        const fromCode = lookupSubscriptionWriteMessageByCode(code);
        if (fromCode) {
            return fromCode;
        }
    }
    return subscriptionMissingFromProblemBody(err);
}

/** Panel listeleri / formlar: ProblemDetails, düz metin ve HTTP durumuna göre anlamlı mesaj. */
export function messageFromHttpError(err: HttpErrorResponse, fallback = 'İstek başarısız.'): string {
    const subscriptionMsg = subscriptionWriteUserMessage(err);
    if (subscriptionMsg) {
        return subscriptionMsg;
    }
    const tenantOrgMsg = tenantOrganizationProblemUserMessage(err);
    if (tenantOrgMsg) {
        return tenantOrgMsg;
    }
    const reminderPanelMsg = reminderPanelProblemUserMessage(err);
    if (reminderPanelMsg) {
        return reminderPanelMsg;
    }
    const vaccinationPanelMsg = vaccinationPanelProblemUserMessage(err);
    if (vaccinationPanelMsg) {
        return vaccinationPanelMsg;
    }
    const clinicPanelMsg = clinicPanelProblemUserMessage(err);
    if (clinicPanelMsg) {
        return clinicPanelMsg;
    }
    const visitPanelMsg = visitPanelProblemUserMessage(err);
    if (visitPanelMsg) {
        return visitPanelMsg;
    }
    const chargePanelMsg = chargePanelProblemUserMessage(err);
    if (chargePanelMsg) {
        return chargePanelMsg;
    }
    const administrationPanelMsg = administrationPanelProblemUserMessage(err);
    if (administrationPanelMsg) {
        return administrationPanelMsg;
    }
    const labResultPanelMsg = labResultPanelProblemUserMessage(err);
    if (labResultPanelMsg) {
        return labResultPanelMsg;
    }
    const hospitalizationPanelMsg = hospitalizationPanelProblemUserMessage(err);
    if (hospitalizationPanelMsg) {
        return hospitalizationPanelMsg;
    }
    const examinationFinalizeMsg = examinationFinalizeProblemUserMessage(err);
    if (examinationFinalizeMsg) {
        return examinationFinalizeMsg;
    }

    const body = err.error as ProblemDetails | string | null | undefined;
    if (body && typeof body === 'object') {
        const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
        if (detail && !isUnhelpfulProblemText(detail)) {
            return detail;
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title && !isUnhelpfulProblemText(title)) {
            return title;
        }
    }
    if (typeof body === 'string') {
        const t = body.trim();
        if (t && !isUnhelpfulProblemText(t)) {
            return t;
        }
    }

    if (err.status === 429) {
        return rateLimitUserMessage(err);
    }

    const fromStatus = panelHttpStatusUserMessage(err.status);
    if (fromStatus) {
        return fromStatus;
    }

    if (err.message?.trim() && !isUnhelpfulProblemText(err.message)) {
        return err.message.trim();
    }
    return fallback;
}

/** Rapor 403 toparlama: gövde + Angular mesajından küçük harf metin. */
function httpErrorDiagnosticBlobLower(err: HttpErrorResponse): string {
    const parts: string[] = [];
    const body = err.error as unknown;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const o = body as Record<string, unknown>;
        for (const k of ['detail', 'Detail', 'title', 'Title']) {
            const v = o[k];
            if (typeof v === 'string' && v.trim()) {
                parts.push(v.trim());
            }
        }
    }
    if (typeof body === 'string' && body.trim()) {
        parts.push(body.trim());
    }
    if (err.message?.trim()) {
        parts.push(err.message.trim());
    }
    return parts.join('\n').toLocaleLowerCase('tr-TR');
}

/**
 * Rapor yükleme 403: açık `clinicId` ile gönderilmiş istekte klinik bağlamı / JWT uyumsuzluğu toparlanabilir.
 * `Reports.AccessDenied` genel yetki olarak retry edilmez.
 */
export function isReportRecoverableClinicConstraint403(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) {
        return false;
    }
    if (err.status !== 403) {
        return false;
    }
    const codeRaw = readProblemCodeFromHttp(err);
    const code = codeRaw?.replace(/\./g, '').toLowerCase() ?? '';
    if (code === 'reportsaccessdenied') {
        return false;
    }
    if (code === 'clinicsaccessdenied' || code === 'tenantscontextmissing') {
        return true;
    }
    const blob = httpErrorDiagnosticBlobLower(err);
    if (blob.includes('jwt') && blob.includes('clinic')) {
        return true;
    }
    if (blob.includes('clinic_id') && /farklı|reddedildi|uyumsuz|güvenlik/.test(blob)) {
        return true;
    }
    return false;
}

/** Hatayı kullanıcıya gösterilecek Türkçe mesajlı `Error`'a çevirir (backend `code` eşlemesi `messageFromHttpError` içinde). */
export function toUserError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) =>
        throwError(() => (err instanceof HttpErrorResponse ? new Error(messageFromHttpError(err, fallback)) : err))
    );
}

export function panelHttpFailureMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
        return messageFromHttpError(err, fallback);
    }
    if (err instanceof Error) {
        const m = err.message?.trim() ?? '';
        if (m && !isUnhelpfulProblemText(m)) {
            return m;
        }
    }
    return fallback;
}

function panelHttpStatusUserMessage(status: number): string | null {
    switch (status) {
        case 0:
            return 'Sunucuya ulaşılamıyor. Bağlantıyı kontrol edin.';
        case 400:
        case 422:
            return 'Gönderilen veri işlenemedi. Alanları kontrol edin veya yeniden deneyin.';
        case 401:
            return 'Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.';
        case 403:
            return 'Bu işlem için yetkiniz yok.';
        case 404:
            return 'İstenen kayıt bulunamadı.';
        case 405:
            return 'Bu işlem sunucu tarafından desteklenmiyor. Uygulama güncellemesi gerekebilir.';
        case 408:
        case 504:
            return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
        case 502:
        case 503:
            return 'Ödeme veya abonelik hizmeti geçici olarak yanıt veremedi. Lütfen kısa süre sonra tekrar deneyin.';
        case 409:
            return null;
        case 415:
            return 'İstek biçimi kabul edilmedi.';
        default:
            return null;
    }
}
