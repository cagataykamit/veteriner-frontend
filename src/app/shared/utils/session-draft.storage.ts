/**
 * Tarayıcı taslağı (kullanıcı dostu denetim B3): yazılan form sekme çökmesinde ya da oturum süresi dolunca kaybolmasın diye
 * yalnız `sessionStorage`'da tutulur (kişisel/sağlık verisi; sekme kapanınca tarayıcı siler). Kullanıcı açıkça çıkış yapınca
 * `clearAllSessionDrafts` hepsini siler; oturum süresinin dolması silmez (yeniden girişten sonra sürdürülebilsin).
 * Depolama kullanılamazsa (gizli mod, kota) sessizce vazgeçilir; form çalışmaya devam eder.
 */

const PREFIX = 'vetinity:taslak:';

export interface SessionDraft<T> {
    savedAtUtc: string;
    data: T;
}

/** Anahtar: önek + parçalar (ör. kullanıcı, klinik, kayıt). Boş parça "-" olur. */
export function sessionDraftKey(...parts: (string | null | undefined)[]): string {
    return PREFIX + parts.map((p) => p?.trim() || '-').join(':');
}

export function readSessionDraft<T>(key: string): SessionDraft<T> | null {
    try {
        const raw = sessionStorage.getItem(key);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<SessionDraft<T>>;

        return typeof parsed.savedAtUtc === 'string' && parsed.data !== undefined ? { savedAtUtc: parsed.savedAtUtc, data: parsed.data as T } : null;
    } catch {
        return null;
    }
}

export function writeSessionDraft<T>(key: string, data: T, now: Date = new Date()): void {
    try {
        sessionStorage.setItem(key, JSON.stringify({ savedAtUtc: now.toISOString(), data } satisfies SessionDraft<T>));
    } catch {
        // Kota ya da kapalı depolama: taslak tutulmaz.
    }
}

export function removeSessionDraft(key: string): void {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // yok say
    }
}

/** Açık çıkışta tüm taslaklar silinir. */
export function clearAllSessionDrafts(): void {
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);

            if (key?.startsWith(PREFIX)) {
                sessionStorage.removeItem(key);
            }
        }
    } catch {
        // yok say
    }
}
