import { HttpErrorResponse } from '@angular/common/http';

/**
 * Sözleşmedeki hata kodları (`PORTAL_API_CONTRACT.md` §5, §6.7) → hasta sahibine Türkçe mesaj. Tek yer.
 * Kod `ProblemDetails.extensions.code` (veya üst düzey `code`) alanından okunur; `title`/`detail` metnine güvenilmez.
 */
export const PORTAL_ERROR_CODES = {
    invalidCredentials: 'Portal.Auth.Unauthorized.InvalidCredentials',
    invalidRefreshToken: 'Portal.Auth.Unauthorized.InvalidRefreshToken',
    refreshTokenReused: 'Portal.Auth.Unauthorized.RefreshTokenReused',
    accountUnavailable: 'Portal.Auth.Unauthorized.AccountUnavailable',
    inviteNotFound: 'Portal.Invites.NotFound',
    invitePasswordAlreadySet: 'Portal.Invites.PasswordAlreadySet',
    alreadyLinked: 'OwnerPortal.AlreadyLinked',
    legalRequired: 'LegalAcceptances.Required',
    legalVersionOutdated: 'LegalAcceptances.VersionOutdated',
    linkNotFound: 'Portal.Links.NotFound',
    petNotFound: 'Portal.Pets.NotFound',
    validation: 'Validation.FluentValidation'
} as const;

const C = PORTAL_ERROR_CODES;

export const PORTAL_ERROR_MESSAGES: Readonly<Record<string, string>> = {
    [C.invalidCredentials]: 'Giriş bilgileri doğrulanamadı. Çok sayıda hatalı denemeden sonra giriş geçici olarak kilitlenir.',
    [C.invalidRefreshToken]: 'Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.',
    [C.refreshTokenReused]: 'Güvenliğiniz için tüm oturumlarınız kapatıldı. Lütfen yeniden giriş yapın.',
    [C.accountUnavailable]: 'Hesabınız şu anda kullanılamıyor. Kliniğinizle iletişime geçin.',
    [C.inviteNotFound]: 'Bu davet bağlantısı geçersiz, süresi dolmuş ya da daha önce kullanılmış. Kliniğinizden yeni bir davet isteyin.',
    [C.invitePasswordAlreadySet]: 'Bu hesabın parolası zaten belirlenmiş. Parola alanını boş bırakıp tekrar deneyin.',
    [C.alreadyLinked]: 'Bu müşteri kaydı başka bir portal hesabına bağlanmış. Kliniğinizle iletişime geçin.',
    [C.legalRequired]: 'Devam etmek için belgeleri onaylamanız gerekiyor.',
    [C.legalVersionOutdated]: 'Belgelerin yeni bir sürümü yayımlandı. Güncel sürümü okuyup yeniden onaylayın.',
    [C.linkNotFound]: 'Bu kliniğe erişiminiz kapatılmış ya da bulunamadı.',
    [C.petNotFound]: 'Hayvan kaydı bulunamadı.',
    [C.validation]: 'Girdiğiniz bilgileri kontrol edin.'
};

/** Bağlama özel metin (ör. kodla girişte "kod hatalı"). Varsayılan tablo üzerine yazılır. */
export type PortalErrorOverrides = Readonly<Record<string, string>>;

export const PORTAL_NETWORK_ERROR_MESSAGE = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
export const PORTAL_RATE_LIMIT_MESSAGE = 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
export const PORTAL_SERVER_ERROR_MESSAGE = 'Beklenmeyen bir sorun oluştu. Lütfen daha sonra tekrar deneyin.';
export const PORTAL_GENERIC_ERROR_MESSAGE = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';

export function portalProblemCode(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse)) {
        return null;
    }

    const body = err.error as unknown;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const o = body as Record<string, unknown>;
    const ext = o['extensions'] && typeof o['extensions'] === 'object' ? (o['extensions'] as Record<string, unknown>) : null;
    const candidates = [o['code'], ext?.['code']];

    for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) {
            return c.trim();
        }
    }

    return null;
}

/** HTTP hatası → kullanıcı mesajı. Sıra: bağlam metni, sözleşme kodu, durum kodu. Kişisel veri içermez. */
export function portalErrorMessage(err: unknown, overrides: PortalErrorOverrides = {}): string {
    if (!(err instanceof HttpErrorResponse)) {
        return PORTAL_GENERIC_ERROR_MESSAGE;
    }

    if (err.status === 0) {
        return PORTAL_NETWORK_ERROR_MESSAGE;
    }

    if (err.status === 429) {
        return PORTAL_RATE_LIMIT_MESSAGE;
    }

    const code = portalProblemCode(err);

    if (code) {
        const message = overrides[code] ?? PORTAL_ERROR_MESSAGES[code];

        if (message) {
            return message;
        }
    }

    if (err.status === 400) {
        return overrides[C.validation] ?? PORTAL_ERROR_MESSAGES[C.validation];
    }

    if (err.status >= 500) {
        return PORTAL_SERVER_ERROR_MESSAGE;
    }

    return PORTAL_GENERIC_ERROR_MESSAGE;
}
