import { computed, inject, Injectable, signal } from '@angular/core';
import { PORTAL_SECURE_STORAGE } from '@portal/app/core/native/portal-secure-storage';
import type { PortalAuthTokens } from './portal-auth.models';

/**
 * Portal depolama anahtarları — klinik panelinin anahtarlarından (`accessToken`, `refreshToken` vb.) ayrı ad alanı.
 * Portal ayrıca ayrı origin'de (ayrı port/alan adı) çalışır; iki uygulamanın depolaması paylaşılmaz.
 */
export const PORTAL_STORAGE_KEYS = {
    refreshToken: 'vetinity.portal.refreshToken',
    activeLinkId: 'vetinity.portal.activeLinkId'
} as const;

/**
 * Token saklama (sözleşme §5.1, §5.7):
 * - Access token (15 dk) **yalnız bellekte**; hiçbir depolamaya yazılmaz. Sayfa yenilenince refresh ile yeniden alınır.
 * - Refresh token (30 gün, her yenilemede döner) kalıcı depoda: sözleşme yenilemeyi gövdeyle yapar (httpOnly çerez yok);
 *   uygulama kapatılıp açılınca oturumun sürmesi için kalıcı depolama gerekir. Çalınan eski anahtarın yeniden
 *   kullanımı sunucuda tüm oturumları kapatır. Çıkışta silinir.
 *   - Tarayıcıda (PWA) `localStorage`.
 *   - Mağaza paketinde cihazın anahtar deposu (Keychain/Keystore, `PORTAL_SECURE_STORAGE`); açılışta bir kez belleğe
 *     okunur (`hydrate`), okuma yine senkron kalır. Yenilenen anahtar yazılmadan yeni istek atılmaz (`save` beklenir).
 */
@Injectable({ providedIn: 'root' })
export class PortalTokenStore {
    private readonly secure = inject(PORTAL_SECURE_STORAGE);
    private readonly access = signal<string | null>(null);
    private secureRefresh: string | null = null;

    readonly hasAccessToken = computed(() => this.access() !== null);

    /** Mağaza paketinde anahtar deposundaki refresh token'ı belleğe alır; uygulama açılışında bir kez çağrılır. */
    async hydrate(): Promise<void> {
        if (this.secure) {
            this.secureRefresh = await this.secure.get(PORTAL_STORAGE_KEYS.refreshToken);
        }
    }

    accessToken(): string | null {
        return this.access();
    }

    refreshToken(): string | null {
        return this.secure ? this.secureRefresh : readStorage(PORTAL_STORAGE_KEYS.refreshToken);
    }

    /** Access token hemen belleğe alınır; dönen söz refresh token kalıcı depoya yazılınca tamamlanır. */
    save(tokens: PortalAuthTokens): Promise<void> {
        this.access.set(tokens.accessToken);

        return this.persistRefresh(tokens.refreshToken);
    }

    clear(): void {
        this.access.set(null);
        void this.persistRefresh(null);
        writeStorage(PORTAL_STORAGE_KEYS.activeLinkId, null);
    }

    activeLinkId(): string | null {
        return readStorage(PORTAL_STORAGE_KEYS.activeLinkId);
    }

    setActiveLinkId(linkId: string | null): void {
        writeStorage(PORTAL_STORAGE_KEYS.activeLinkId, linkId);
    }

    private async persistRefresh(value: string | null): Promise<void> {
        if (!this.secure) {
            writeStorage(PORTAL_STORAGE_KEYS.refreshToken, value);

            return;
        }

        this.secureRefresh = value;

        try {
            await (value === null ? this.secure.remove(PORTAL_STORAGE_KEYS.refreshToken) : this.secure.set(PORTAL_STORAGE_KEYS.refreshToken, value));
        } catch {
            // Depoya yazılamazsa oturum bu açılışta bellekte sürer; uygulama yeniden açılınca giriş istenir.
        }
    }
}

function readStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string | null): void {
    try {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    } catch {
        // Depolama kapalıysa (gizli mod vb.) oturum yalnız bu sekmede sürer.
    }
}
