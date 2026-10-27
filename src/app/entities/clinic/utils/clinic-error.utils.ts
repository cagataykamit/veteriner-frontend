import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Klinik oluşturma / panel klinik yazma — `ProblemDetails` + `extensions.code`. */
export const CLINIC_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
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
    TenantsTenantInactive: 'Bu kurum şu anda aktif değil; klinik eklenemiyor.',
    /** `KVKK_CONSENT_API_CONTRACT.md` §2, §2b (açık rıza ve aydınlatma aynı kod); `Clinics.KvkkFormTemplate.Validation` backend `detail` ile gösterilir. */
    'Clinics.KvkkFormTemplate.ConcurrencyConflict': 'Bu KVKK metni siz düzenlerken başka biri tarafından kaydedildi. Güncel metni yükleyip tekrar deneyin.'
};
