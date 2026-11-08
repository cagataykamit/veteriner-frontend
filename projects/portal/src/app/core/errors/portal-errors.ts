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
    deletionCodeInvalid: 'Portal.Account.DeletionCodeInvalid',
    remindersKvkkDeclined: 'Clients.RemindersKvkkDeclined',
    clientConcurrencyConflict: 'Clients.ConcurrencyConflict',
    onlineBookingNotFound: 'OnlineBooking.NotFound',
    onlineBookingInvalidCode: 'OnlineBooking.InvalidCode',
    reasonNotFound: 'AppointmentReasons.NotFound',
    slotUnavailable: 'AppointmentRequests.SlotUnavailable',
    pendingLimitReached: 'AppointmentRequests.PendingLimitReached',
    noteRequired: 'AppointmentRequests.NoteRequired',
    requestNotPending: 'AppointmentRequests.NotPending',
    dataRequestsTooManyOpen: 'Portal.DataRequests.TooManyOpen',
    dataRequestNotOpen: 'Portal.DataRequests.NotOpen',
    dataRequestNotFound: 'Portal.DataRequests.NotFound',
    pushDisabled: 'Portal.Push.Disabled',
    appointmentLinkNotFound: 'AppointmentLinks.NotFound',
    appointmentLinkCancelDisabled: 'AppointmentLinks.CancelDisabled',
    appointmentConcurrencyConflict: 'Appointments.ConcurrencyConflict',
    marketingOptOutNotFound: 'MarketingOptOut.NotFound',
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
    // Klinik portalı kapattığında da aynı kod döner (§12); sebep ayırt edilmez.
    [C.linkNotFound]: 'Bu kliniğe portal erişiminiz şu an yok: klinik portalı geçici olarak kapatmış ya da erişiminizi sonlandırmış olabilir. Bilgi için kliniğinizle iletişime geçin.',
    [C.petNotFound]: 'Hayvan kaydı bulunamadı.',
    [C.deletionCodeInvalid]: 'Onay kodu doğrulanamadı. Kod yanlış ya da süresi dolmuş olabilir; yeni kod isteyip tekrar deneyin.',
    [C.remindersKvkkDeclined]: 'Klinikteki KVKK açık rıza kaydınız "Ret" olduğu için hatırlatmalar açılamıyor. Açmak için kliniğinizle görüşün.',
    [C.clientConcurrencyConflict]: 'Kaydınız bu sırada klinik tarafından güncellendi. Sayfayı yenileyip tekrar deneyin.',
    [C.onlineBookingNotFound]: 'Bu online randevu sayfası kapalı ya da bağlantı geçersiz.',
    [C.onlineBookingInvalidCode]: 'Doğrulama kodu hatalı ya da süresi dolmuş. Kodu kontrol edin ya da yeni kod isteyin.',
    [C.reasonNotFound]: 'Seçtiğiniz randevu nedeni artık online alınmıyor. Başka bir neden seçin.',
    [C.slotUnavailable]: 'Seçtiğiniz saat artık müsait değil. Lütfen başka bir saat seçin.',
    [C.pendingLimitReached]: 'Bu klinikte bekleyen talep sınırına ulaştınız. Klinik mevcut taleplerinizi yanıtladıktan sonra yeni talep oluşturabilirsiniz.',
    [C.noteRequired]: 'Ne için geldiğinizi kısaca yazın.',
    [C.requestNotPending]: 'Bu talep artık beklemede değil; sayfayı yenileyin.',
    [C.dataRequestsTooManyOpen]: 'Bu klinikte yanıt bekleyen 3 talebiniz var. Klinik bunlardan birini yanıtladıktan sonra yeni talep oluşturabilirsiniz.',
    [C.dataRequestNotOpen]: 'Bu talep artık geri çekilemez: klinik incelemeye almış ya da yanıtlamış olabilir. Liste yenilendi.',
    [C.dataRequestNotFound]: 'Talep bulunamadı; liste yenilendi.',
    // Hatırlatma bağlantısı: geçersiz, kullanılmış ve süresi dolmuş aynı kodla döner; sebep ayırt edilmez.
    [C.appointmentLinkNotFound]: 'Bu bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış. Randevunuzla ilgili kliniğinizi arayabilirsiniz.',
    [C.appointmentLinkCancelDisabled]: 'Bu klinik bağlantıdan iptali kapattı. İptal için lütfen kliniği arayın.',
    [C.appointmentConcurrencyConflict]: 'Randevunuz bu sırada güncellendi. Sayfayı yenileyip tekrar deneyin.',
    [C.marketingOptOutNotFound]: 'Bu bağlantı geçersiz. Ticari ileti almak istemiyorsanız kliniğinize bildirebilir ya da portalda Hesabım > Bildirim tercihlerinden kapatabilirsiniz.',
    [C.pushDisabled]: 'Anlık bildirim tercihiniz kapalı; önce bildirimleri açın.',
    [C.validation]: 'Girdiğiniz bilgileri kontrol edin.'
};

/** Bağlama özel metin (ör. kodla girişte "kod hatalı"). Varsayılan tablo üzerine yazılır. */
export type PortalErrorOverrides = Readonly<Record<string, string>>;

export const PORTAL_NETWORK_ERROR_MESSAGE = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
export const PORTAL_RATE_LIMIT_MESSAGE = 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
export const PORTAL_SERVER_ERROR_MESSAGE = 'Beklenmeyen bir sorun oluştu. Lütfen daha sonra tekrar deneyin.';
export const PORTAL_GENERIC_ERROR_MESSAGE = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
/** `/me` bağında `isClinicPortalEnabled=false` (§12): klinik seçimi ve kabuk aynı metni gösterir. */
export const PORTAL_CLINIC_CLOSED_MESSAGE = 'Bu klinik portal erişimini geçici olarak kapattı; bilgi için kliniğinizle iletişime geçin.';
/** `/me` bağında `isPortalServiceAvailable=false` (§12.1): ticari bilgi (paket) yazılmaz; sahip hakları açık kalır. */
export const PORTAL_SERVICE_UNAVAILABLE_MESSAGE =
    'Kliniğiniz bu hizmeti şu an sunmuyor; bilgi için kliniğinize başvurun. Veri talebi, bildirim tercihleri ve hesap silme Hesabım sayfasında açık.';
/** Klinik seçiminde kısa not (§12.1). */
export const PORTAL_SERVICE_UNAVAILABLE_SHORT_MESSAGE = 'Kliniğiniz bu hizmeti şu an sunmuyor; bilgi için kliniğinize başvurun.';

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
