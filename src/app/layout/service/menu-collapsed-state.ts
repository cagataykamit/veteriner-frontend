const STORAGE_KEY_PREFIX = 'vetinity.menu.collapsed';

const key = (userId: string): string => `${STORAGE_KEY_PREFIX}.${userId}`;

/** Kullanıcının menüyü simge şeridine daraltma tercihi; kayıt yoksa veya depo eriÅŸilemezse `false` (açık). */
export function readMenuCollapsed(userId: string | null): boolean {
    if (!userId) {
        return false;
    }

    try {
        return localStorage.getItem(key(userId)) === 'true';
    } catch {
        return false;
    }
}

export function writeMenuCollapsed(userId: string | null, collapsed: boolean): void {
    if (!userId) {
        return;
    }

    try {
        localStorage.setItem(key(userId), String(collapsed));
    } catch {
        // Tercih yalnız bu oturumda geçerli kalır.
    }
}
