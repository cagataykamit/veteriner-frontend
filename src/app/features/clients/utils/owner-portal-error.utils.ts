import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/**
 * Hasta sahibi portalı klinik paneli uçları — `PORTAL_API_CONTRACT.md` §4. Davet uygunluk kodları hem 409 yanıtında hem
 * `portal-access.inviteBlockedCode` alanında gelir; metin tek yerde (`ownerPortalProblemUserMessageByCode`).
 */
export const OWNER_PORTAL_PROBLEM_MESSAGES: ProblemMessages = {
    'OwnerPortal.ClientEmailMissing': 'Portal daveti bu müşteriye gönderilemez: müşteri kaydında e-posta yok. Davet e-postayla gider; önce müşteri kaydına e-posta ekleyin.',
    'OwnerPortal.ClientOptedOut': 'Portal daveti bu müşteriye gönderilemez: müşteri KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor.',
    'OwnerPortal.ClientNotInvitable': 'Portal daveti bu müşteriye gönderilemez: peşin müşteri (sistem kaydı) portala davet edilemez.',
    'OwnerPortal.AlreadyLinked': 'Bu müşterinin portal erişimi zaten açık; yeni davet gerekmez.',
    'OwnerPortal.ClinicRequired': 'Portal daveti için önce bir klinik seçmelisiniz.',
    'OwnerPortal.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'OwnerPortal.ClinicInvalid': 'Aktif klinik bulunamadı veya pasif; portal daveti gönderilemez.',
    'OwnerPortal.InviteNotFound': 'Davet bulunamadı. Sayfayı yenileyin.',
    'OwnerPortal.InviteNotPending': 'Bu davet artık beklemede değil (kabul edilmiş ya da iptal edilmiş). Sayfayı yenileyin.',
    'OwnerPortal.LinkNotFound': 'Portal erişimi bulunamadı. Sayfayı yenileyin.',
    'OwnerPortal.LinkAlreadyClosed': 'Bu portal erişimi zaten kapatılmış. Sayfayı yenileyin.'
};

export function ownerPortalProblemUserMessageByCode(code: string | null | undefined): string | null {
    return code ? (OWNER_PORTAL_PROBLEM_MESSAGES[code] ?? null) : null;
}
