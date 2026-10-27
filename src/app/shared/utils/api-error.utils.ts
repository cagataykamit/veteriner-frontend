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

/** ProblemDetails kodu → kullanıcıya gösterilecek metin. */
export type ProblemMessages = Readonly<Record<string, string>>;

/** Tablodan koda karşılık metin: önce birebir, sonra noktasız yazım (`Clinics.AccessDenied` → `ClinicsAccessDenied`). */
export function problemMessageByCode(code: string | null | undefined, messages: ProblemMessages): string | null {
    return code ? (messages[code] ?? messages[code.replace(/\./g, '')] ?? null) : null;
}

let domainProblemMessages: readonly ProblemMessages[] = [];

/**
 * Alan ve özellik tabloları (aşı, geliş, ücret, satış…) kendi klasörlerinde yaşar; uygulama kökü (`src/problem-messages.ts`)
 * onları bu fonksiyonla kaydeder. `messageFromHttpError` genel eşlemeden sonra tablolara kayıt sırasıyla bakar; aynı kod
 * birden çok tabloda varsa ilk tablonun metni kazanır. Her çağrı önceki kaydın yerine geçer.
 */
export function registerProblemMessages(tables: readonly ProblemMessages[]): void {
    domainProblemMessages = tables;
}

/**
 * Deneme (trial) kiracısı kısıtları — `docs/TRIAL_LIMITS_API_CONTRACT.md` §3, §5. Kod `Trial.` önekli ve 422;
 * sunucunun `detail` metni olduğu gibi gösterilir, yanına "Aboneliğe geç" eylemi eklenir (`AppTrialLimitNoticeComponent`).
 * `detail` yoksa koda göre sözleşmedeki metin kullanılır. Ücretli kiracının `*.ExportTooManyRows` / `Imports.TooManyRows` dalları ayrıdır.
 */
const TRIAL_LIMIT_CODE_PREFIX = 'Trial.';

const TRIAL_LIMIT_FALLBACK_MESSAGES: Record<string, string> = {
    'Trial.ExportLimitExceeded': 'Deneme sürümünde dışa aktarma en fazla 1000 satır sınırı; abonelikle kalkar. Filtreyi daraltın.',
    'Trial.ImportLimitExceeded': 'Deneme sürümünde içe aktarma tablo başına en fazla 500 satır sınırı; abonelikle kalkar.'
};

const TRIAL_LIMIT_GENERIC_MESSAGE = 'Deneme sürümünde bu işlem için sınır aşıldı; sınır abonelikle kalkar.';

export const TRIAL_LIMIT_ACTION_LABEL = 'Aboneliğe geç';

/** Deneme kısıtı hatası: mesaj kullanıcıya gösterilecek metindir; `code` ile ekran "Aboneliğe geç" eylemini ekler. */
export class TrialLimitError extends Error {
    constructor(
        message: string,
        readonly code: string
    ) {
        super(message);
        this.name = 'TrialLimitError';
    }
}

/** `Trial.*` problem kodu; başka hata ya da başka kod ise `null`. */
export function trialLimitProblemCode(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) {
        return null;
    }

    const code = readProblemCodeFromHttp(err);

    return code?.startsWith(TRIAL_LIMIT_CODE_PREFIX) ? code : null;
}

/** Servis katmanında `Error`'a çevrilmiş (`TrialLimitError`) ya da ham `HttpErrorResponse` deneme kısıtı. */
export function isTrialLimitError(err: unknown): boolean {
    return err instanceof TrialLimitError || trialLimitProblemCode(err) !== null;
}

function trialLimitProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = trialLimitProblemCode(err);

    if (!code) {
        return null;
    }

    const body = err.error as Record<string, unknown>;
    const detail = typeof body['detail'] === 'string' ? body['detail'].trim() : '';

    if (detail && !isUnhelpfulProblemText(detail)) {
        return detail;
    }

    return TRIAL_LIMIT_FALLBACK_MESSAGES[code] ?? TRIAL_LIMIT_GENERIC_MESSAGE;
}

/** HTTP hatasını kullanıcı mesajlı `Error`'a çevirir; deneme kısıtında `TrialLimitError` (ekran eylem bağlantısı ekler). */
export function userErrorFromHttp(err: HttpErrorResponse, fallback: string): Error {
    const message = messageFromHttpError(err, fallback);
    const trialCode = trialLimitProblemCode(err);

    return trialCode ? new TrialLimitError(message, trialCode) : new Error(message);
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
const TENANT_ORGANIZATION_PROBLEM_MESSAGES: ProblemMessages = {
    'Tenants.AccessDenied': 'Bu kuruma erişim yetkiniz bulunmuyor.',
    TenantsAccessDenied: 'Bu kuruma erişim yetkiniz bulunmuyor.',
    'Tenants.NotFound': 'Kurum kaydı bulunamadı veya artık erişilemiyor.',
    TenantsNotFound: 'Kurum kaydı bulunamadı veya artık erişilemiyor.',
    'Tenants.DuplicateName': 'Bu kurum adı zaten kullanılıyor. Lütfen farklı bir ad deneyin.',
    TenantsDuplicateName: 'Bu kurum adı zaten kullanılıyor. Lütfen farklı bir ad deneyin.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok.',
    AuthPermissionDenied: 'Bu işlem için yetkiniz yok.'
};

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

/**
 * Panel listeleri / formlar: ProblemDetails, düz metin ve HTTP durumuna göre anlamlı mesaj. `overrides` bağlama özel koda
 * metin tablosudur (ör. bir tanım ucunun kodları); genel eşlemeden önce ona bakılır.
 */
export function messageFromHttpError(err: HttpErrorResponse, fallback = 'İstek başarısız.', overrides?: ProblemMessages): string {
    const code = readProblemCodeFromHttp(err);
    const overrideMsg = overrides ? problemMessageByCode(code, overrides) : null;

    if (overrideMsg) {
        return overrideMsg;
    }

    const trialLimitMsg = trialLimitProblemUserMessage(err);

    if (trialLimitMsg) {
        return trialLimitMsg;
    }

    const subscriptionMsg = subscriptionWriteUserMessage(err);

    if (subscriptionMsg) {
        return subscriptionMsg;
    }

    for (const table of [TENANT_ORGANIZATION_PROBLEM_MESSAGES, ...domainProblemMessages]) {
        const tableMsg = problemMessageByCode(code, table);

        if (tableMsg) {
            return tableMsg;
        }
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

/** Hatayı kullanıcıya gösterilecek Türkçe mesajlı `Error`'a çevirir (backend `code` eşlemesi `messageFromHttpError` içinde; deneme kısıtı `TrialLimitError`). */
export function toUserError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) =>
        throwError(() => (err instanceof HttpErrorResponse ? userErrorFromHttp(err, fallback) : err))
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
