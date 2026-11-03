/** Bugün ekranında bekleyen online talepler: "Açık işler" satırında tek çip ya da sayfa başında kutucuklar. */
export type PendingRequestsView = 'chip' | 'tiles';

export const DEFAULT_PENDING_REQUESTS_VIEW: PendingRequestsView = 'chip';

const STORAGE_KEY_PREFIX = 'vetinity.pendingRequestsView';

const key = (userId: string): string => `${STORAGE_KEY_PREFIX}.${userId}`;

/** Kullanıcının görünüm tercihi; kayıt yoksa, tanınmıyorsa veya depo erişilemezse varsayılan (çip). */
export function readPendingRequestsView(userId: string | null): PendingRequestsView {
    if (!userId) {
        return DEFAULT_PENDING_REQUESTS_VIEW;
    }

    try {
        return localStorage.getItem(key(userId)) === 'tiles' ? 'tiles' : DEFAULT_PENDING_REQUESTS_VIEW;
    } catch {
        return DEFAULT_PENDING_REQUESTS_VIEW;
    }
}

export function writePendingRequestsView(userId: string | null, view: PendingRequestsView): void {
    if (!userId) {
        return;
    }

    try {
        localStorage.setItem(key(userId), view);
    } catch {
        // Tercih yalnız bu oturumda geçerli kalır.
    }
}
