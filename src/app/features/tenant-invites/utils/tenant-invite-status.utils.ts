/**
 * Davet durumu ve iptal / yeniden gönder görünürlüğü.
 * Backend `TenantInviteStatus` (`Backend.Veteriner.Domain/Tenants/TenantInviteStatus.cs`):
 * `Pending = 0`, `Accepted = 1`, `Revoked = 2`. JSON’da sayı olarak gelir.
 *
 * “Süresi doldu” ayrı enum değeri değildir: `Pending` (0) + `isExpired === true`.
 *
 * Backend `canCancel` / `canResend` boolean gönderirse öncelik onlardadır; yoksa durum + süre (+ API `isExpired`) ile türetilir.
 */

import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

/** UI + aksiyon türevi için genişletilmiş lifecycle (`expired_pending` yalnızca gösterim / türetilmiş). */
export type TenantInviteLifecycle =
    | 'pending'
    | 'expired_pending'
    | 'sent'
    | 'accepted'
    | 'cancelled'
    | 'expired'
    | 'declined'
    | 'revoked'
    | 'unknown';

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/** Ham `status` alanından 0 | 1 | 2; aksi halde `null` (string / bilinmeyen). */
export function parseTenantInviteStatusCode(raw: string | null | undefined): number | null {
    const t = (raw ?? '').trim();
    if (!/^\d+$/.test(t)) {
        return null;
    }
    const n = Number(t);
    if (n === 0 || n === 1 || n === 2) {
        return n;
    }
    return null;
}

/**
 * Backend enum → aksiyon mantığı için temel lifecycle (`Pending` süresi dolmuş olsa bile burada `pending` kalır).
 */
export function tenantInviteBackendLifecycleFromStatusCode(code: number | null): TenantInviteLifecycle {
    if (code === 0) {
        return 'pending';
    }
    if (code === 1) {
        return 'accepted';
    }
    if (code === 2) {
        return 'revoked';
    }
    return 'unknown';
}

/**
 * Liste/detay etiketi ve tag için lifecycle.
 * `0 + isExpired` → `expired_pending` (“Süresi doldu”); diğerleri enum ile uyumlu.
 */
export function tenantInviteDisplayLifecycle(statusCode: number | null, isExpiredFromApi: boolean): TenantInviteLifecycle {
    if (statusCode === 0 && isExpiredFromApi) {
        return 'expired_pending';
    }
    if (statusCode === 0) {
        return 'pending';
    }
    if (statusCode === 1) {
        return 'accepted';
    }
    if (statusCode === 2) {
        return 'revoked';
    }
    return 'unknown';
}

/** Sayısal enum yoksa string heuristik; `pending` + API `isExpired` ise gösterim `expired_pending`. */
export function tenantInviteResolveDisplayLifecycle(
    statusRaw: string | null | undefined,
    isExpiredFromApi: boolean
): TenantInviteLifecycle {
    const code = parseTenantInviteStatusCode(statusRaw);
    if (code !== null) {
        return tenantInviteDisplayLifecycle(code, isExpiredFromApi);
    }
    const h = tenantInviteLifecycleFromRaw(statusRaw);
    if (h === 'pending' && isExpiredFromApi) {
        return 'expired_pending';
    }
    return h;
}

/** Ham API durum metninden sınıflandırma — önce sayısal enum; yoksa Türkçe/İngilizce string (eski API). */
export function tenantInviteLifecycleFromRaw(raw: string | null | undefined): TenantInviteLifecycle {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) {
        return 'unknown';
    }
    const code = parseTenantInviteStatusCode(trimmed);
    if (code !== null) {
        return tenantInviteBackendLifecycleFromStatusCode(code);
    }
    const s = norm(trimmed);
    if (s.includes('accept') || s.includes('tamam') || s.includes('complete') || s.includes('kullan')) {
        return 'accepted';
    }
    if (s.includes('cancel') || s.includes('iptal') || s.includes('revoke') || s.includes('geri')) {
        return 'cancelled';
    }
    if (s.includes('decline') || s.includes('red')) {
        return 'declined';
    }
    if (s.includes('expire') || s.includes('süresi') || s.includes('sure')) {
        return 'expired';
    }
    if (s.includes('pend') || s.includes('bekle') || s.includes('waiting') || s.includes('open') || s.includes('created')) {
        return 'pending';
    }
    if (s.includes('sent') || s.includes('gönder') || s.includes('gonder') || s.includes('mail')) {
        return 'sent';
    }
    return 'unknown';
}

/**
 * Liste/detay durum etiketi — Accepted + sunucunun `isCurrentMember === false` bilgisinde özel metin.
 * `isCurrentMember` tanımsızken eski API: Accepted için yalnızca “Kabul edildi” (alan yok sayılmaz).
 */
export function tenantInviteDisplayStatusLabel(
    lifecycle: TenantInviteLifecycle,
    isCurrentMember?: boolean
): string {
    if (lifecycle === 'accepted' && isCurrentMember === false) {
        return PANEL_COPY.tenantInviteStatusAcceptedMembershipRemoved;
    }
    return tenantInviteStatusLabel(lifecycle);
}

/** Lifecycle → panel dilinde kısa etiket (liste/detay ortak). */
export function tenantInviteStatusLabel(lifecycle: TenantInviteLifecycle): string {
    switch (lifecycle) {
        case 'pending':
            return PANEL_COPY.tenantInviteStatusPending;
        case 'expired_pending':
            return PANEL_COPY.tenantInviteStatusExpired;
        case 'sent':
            return PANEL_COPY.tenantInviteStatusSent;
        case 'accepted':
            return PANEL_COPY.tenantInviteStatusAccepted;
        case 'cancelled':
            return PANEL_COPY.tenantInviteStatusCancelled;
        case 'expired':
            return PANEL_COPY.tenantInviteStatusExpired;
        case 'declined':
            return PANEL_COPY.tenantInviteStatusDeclined;
        case 'revoked':
            return PANEL_COPY.tenantInviteStatusRevoked;
        default:
            return PANEL_COPY.tenantInviteStatusUnknown;
    }
}

/** `app-status-tag` / `p-tag` severity. */
export function tenantInviteStatusTagSeverity(lifecycle: TenantInviteLifecycle): StatusTagSeverity {
    switch (lifecycle) {
        case 'accepted':
            return 'success';
        case 'expired_pending':
            return 'danger';
        case 'cancelled':
        case 'declined':
            return 'danger';
        case 'revoked':
            return 'secondary';
        case 'expired':
            return 'secondary';
        case 'sent':
            return 'info';
        case 'pending':
            return 'warn';
        default:
            return 'secondary';
    }
}

/**
 * Davet listesi / detay için gösterim severity’si.
 * Accepted + üyelik yok (`false`): warn; Accepted + üye veya alan yok: success.
 * Bekleyen davetler: info (liste/detay isteği).
 */
export function tenantInviteDisplayStatusSeverity(
    lifecycle: TenantInviteLifecycle,
    isCurrentMember?: boolean
): StatusTagSeverity {
    if (lifecycle === 'accepted') {
        return isCurrentMember === false ? 'warn' : 'success';
    }
    if (lifecycle === 'pending') {
        return 'info';
    }
    return tenantInviteStatusTagSeverity(lifecycle);
}

function parseIsoMs(iso: string | null | undefined): number | null {
    if (!iso?.trim()) {
        return null;
    }
    const t = Date.parse(iso.trim());
    return Number.isNaN(t) ? null : t;
}

/** Son geçerlilik UTC ISO; geçmişteyse true (iptal için “süresi dolmuş bekleyen” senaryosu). */
export function isInvitePastExpiryUtc(expiresAtUtc: string | null | undefined): boolean {
    const t = parseIsoMs(expiresAtUtc ?? null);
    if (t == null) {
        return false;
    }
    return t < Date.now();
}

export interface InviteExplicitActionFlags {
    canCancel: boolean | null;
    canResend: boolean | null;
}

/**
 * `explicit` içinde ilgili alan `true` / `false` ise sunucu sinyali olarak doğrudan kullanılır.
 * `null` ise durum + süre (+ API `isExpired`) ile türetilir (geriye dönük uyumluluk).
 *
 * `lifecycle` aksiyon türevi için lifecycle’dır (çoğunlukla `pending` | `accepted` | `revoked` | …); `expired_pending` buraya verilmez.
 */
export function resolveInviteActions(
    lifecycle: TenantInviteLifecycle,
    expiresAtUtc: string | null,
    explicit: InviteExplicitActionFlags,
    isExpiredFromApi: boolean | null = null
): { canCancel: boolean; canResend: boolean } {
    const pastByUtc = isInvitePastExpiryUtc(expiresAtUtc);
    const expiredPendingApi = lifecycle === 'pending' && isExpiredFromApi === true;
    const pastForResend = pastByUtc || expiredPendingApi;

    const terminal =
        lifecycle === 'accepted' ||
        lifecycle === 'cancelled' ||
        lifecycle === 'declined' ||
        lifecycle === 'revoked' ||
        lifecycle === 'expired';

    const derivedOpen = !terminal && (lifecycle === 'pending' || lifecycle === 'sent');

    const derivedCancel = derivedOpen;
    const derivedResend = derivedOpen && !pastForResend;

    const canCancel = explicit.canCancel === null ? derivedCancel : explicit.canCancel;
    const canResend = explicit.canResend === null ? derivedResend : explicit.canResend;
    return { canCancel, canResend };
}
