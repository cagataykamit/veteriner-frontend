/**
 * Davet durumu ve iptal / yeniden gönder görünürlüğü.
 * Backend `canCancel` / `canResend` boolean gönderirse öncelik onlardadır; yoksa durum + süre ile türetilir.
 */

export type TenantInviteLifecycle =
    | 'pending'
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

/** Ham API durum metninden sınıflandırma (Türkçe/İngilizce varyantlar). */
export function tenantInviteLifecycleFromRaw(raw: string | null | undefined): TenantInviteLifecycle {
    const s = norm(raw ?? '');
    if (!s) {
        return 'unknown';
    }
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
 * `explicit` içindeki alan `true` → göster; `false` → gizle; `null` → türet.
 * Terminal durumlarda (kabul/iptal vb.) her iki aksiyon da kapatılır.
 */
export function resolveInviteActions(
    lifecycle: TenantInviteLifecycle,
    expiresAtUtc: string | null,
    explicit: InviteExplicitActionFlags
): { canCancel: boolean; canResend: boolean } {
    const past = isInvitePastExpiryUtc(expiresAtUtc);
    const terminal =
        lifecycle === 'accepted' ||
        lifecycle === 'cancelled' ||
        lifecycle === 'declined' ||
        lifecycle === 'revoked' ||
        lifecycle === 'expired';

    const derivedOpen = !terminal && (lifecycle === 'pending' || lifecycle === 'sent');

    const baseCancel =
        explicit.canCancel === false ? false : explicit.canCancel === true ? true : derivedOpen;

    const baseResend =
        explicit.canResend === false
            ? false
            : explicit.canResend === true
              ? true
              : derivedOpen;

    return {
        canCancel: baseCancel && !terminal,
        canResend: baseResend && !terminal && !past
    };
}
