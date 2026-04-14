const STORAGE_KEY = 'veteriner.subscription.checkoutSessionId';
/** Hosted ödeme sayfasına gidildi; dönüşte query yoksa bile abonelik sayfası senkron başlatabilsin. */
const EXPECTING_HOSTED_RETURN_KEY = 'veteriner.subscription.expectingHostedReturn';

function trimOrEmpty(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

export function readStoredCheckoutSessionId(): string | null {
    if (typeof sessionStorage === 'undefined') {
        return null;
    }
    try {
        return trimOrEmpty(sessionStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

export function writeStoredCheckoutSessionId(checkoutSessionId: string): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }
    const id = trimOrEmpty(checkoutSessionId);
    if (!id) {
        return;
    }
    try {
        sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
        /* ignore quota / private mode */
    }
}

export function markExpectingHostedCheckoutReturn(): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }
    try {
        sessionStorage.setItem(EXPECTING_HOSTED_RETURN_KEY, '1');
    } catch {
        /* ignore */
    }
}

/** Dönüş tek seferlik işlenir; tekrar yanlışlıkla polling başlatılmasın. */
export function consumeExpectingHostedCheckoutReturn(): boolean {
    if (typeof sessionStorage === 'undefined') {
        return false;
    }
    try {
        const v = sessionStorage.getItem(EXPECTING_HOSTED_RETURN_KEY);
        sessionStorage.removeItem(EXPECTING_HOSTED_RETURN_KEY);
        return v === '1';
    } catch {
        return false;
    }
}

export function clearStoredCheckoutSessionId(): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

const UPGRADE_SUCCESS_ACK_PREFIX = 'veteriner.subscription.upgradeSuccessAck.';

/** Aynı checkout oturumu için yükseltme başarı bildiriminin tekrar gösterilmesini engeller (sayfa yenileme dahil). */
export function hasUpgradeSuccessAck(checkoutSessionId: string): boolean {
    if (typeof sessionStorage === 'undefined') {
        return false;
    }
    const id = trimOrEmpty(checkoutSessionId);
    if (!id) {
        return false;
    }
    try {
        return sessionStorage.getItem(UPGRADE_SUCCESS_ACK_PREFIX + id) === '1';
    } catch {
        return false;
    }
}

export function markUpgradeSuccessAck(checkoutSessionId: string): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }
    const id = trimOrEmpty(checkoutSessionId);
    if (!id) {
        return;
    }
    try {
        sessionStorage.setItem(UPGRADE_SUCCESS_ACK_PREFIX + id, '1');
    } catch {
        /* ignore */
    }
}
