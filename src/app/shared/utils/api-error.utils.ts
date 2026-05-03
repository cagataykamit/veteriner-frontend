import { HttpErrorResponse } from '@angular/common/http';
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

/** Abonelik / tenant yazma kilidi — backend `ProblemDetails` + `extensions.code`. */
const SUBSCRIPTION_WRITE_USER_MESSAGES: Record<string, string> = {
    'Subscriptions.TenantReadOnly':
        'Bu işletme salt okunur moddadır; yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    'Subscriptions.TenantCancelled':
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.',
    'Subscriptions.NotFound': 'Abonelik kaydı bulunamadı; bu işlem şu an yapılamıyor.',
    'Subscriptions.PlanCodeInvalid': 'Seçilen paket kodu geçerli değil.',
    'Subscriptions.SamePlanAlreadyActive': 'Bu paket zaten aktif görünüyor; farklı bir paket seçin.',
    'Subscriptions.DowngradeMustBeScheduled': 'Bu paket düşürme işlemi dönem sonuna planlanmalıdır.',
    'Subscriptions.UpgradeRequiresCheckout': 'Yükseltme işlemi için ödeme adımını tamamlamanız gerekiyor.',
    'Subscriptions.CheckoutSessionNotOpen': 'Checkout oturumu artık açık değil. Lütfen yeniden başlatın.',
    'Subscriptions.CheckoutSessionNotFound': 'Checkout oturumu bulunamadı; işlemi yeniden başlatın.',
    'Subscriptions.PendingPlanChangeNotFound': 'Bekleyen plan değişikliği bulunamadı.',
    'Subscriptions.PendingPlanChangeNotCancelable': 'Bekleyen plan değişikliği artık iptal edilemiyor.',
    'Subscriptions.DowngradeScheduleConflict': 'Bu plan geçişi şu an planlanamıyor. Özet bilgiyi yenileyip tekrar deneyin.'
};

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

function subscriptionWriteUserMessage(err: HttpErrorResponse): string | null {
    const code = readProblemCodeFromHttp(err);
    if (!code) {
        return null;
    }
    return SUBSCRIPTION_WRITE_USER_MESSAGES[code] ?? null;
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
    const clinicPanelMsg = clinicPanelProblemUserMessage(err);
    if (clinicPanelMsg) {
        return clinicPanelMsg;
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

/**
 * Bilinmeyen `catch` / subscribe hatası: HTTP ise gövde+ durum, değilse güvenli fallback.
 */
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
