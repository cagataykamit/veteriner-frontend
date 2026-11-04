/** Bugün ekranında bekleyen online talepler: sayfa başında kutucuklar ya da "Açık işler" satırında tek çip. */
export type PendingRequestsView = 'chip' | 'tiles';

export const DEFAULT_PENDING_REQUESTS_VIEW: PendingRequestsView = 'tiles';

const STORAGE_KEY_PREFIX = 'vetinity.pendingRequestsView';

const key = (userId: string): string => `${STORAGE_KEY_PREFIX}.${userId}`;

/** Kullanıcının görünüm tercihi; kayıt yoksa, tanınmıyorsa veya depo erişilemezse varsayılan (kutucuk). */
export function readPendingRequestsView(userId: string | null): PendingRequestsView {
    if (!userId) {
        return DEFAULT_PENDING_REQUESTS_VIEW;
    }

    try {
        const stored = localStorage.getItem(key(userId));

        return stored === 'chip' || stored === 'tiles' ? stored : DEFAULT_PENDING_REQUESTS_VIEW;
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
