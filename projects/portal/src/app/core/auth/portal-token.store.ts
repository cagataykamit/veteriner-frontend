import { computed, Injectable, signal } from '@angular/core';
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
 * - Refresh token (30 gün, her yenilemede döner) `localStorage`'da: sözleşme yenilemeyi gövdeyle yapar (httpOnly çerez yok);
 *   kurulu PWA kapatılıp açılınca oturumun sürmesi için kalıcı depolama gerekir. Çalınan eski anahtarın yeniden
 *   kullanımı sunucuda tüm oturumları kapatır. Çıkışta silinir.
 */
@Injectable({ providedIn: 'root' })
export class PortalTokenStore {
    private readonly access = signal<string | null>(null);

    readonly hasAccessToken = computed(() => this.access() !== null);

    accessToken(): string | null {
        return this.access();
    }

    refreshToken(): string | null {
        return readStorage(PORTAL_STORAGE_KEYS.refreshToken);
    }

    save(tokens: PortalAuthTokens): void {
        this.access.set(tokens.accessToken);
        writeStorage(PORTAL_STORAGE_KEYS.refreshToken, tokens.refreshToken);
    }

    clear(): void {
        this.access.set(null);
        writeStorage(PORTAL_STORAGE_KEYS.refreshToken, null);
        writeStorage(PORTAL_STORAGE_KEYS.activeLinkId, null);
    }

    activeLinkId(): string | null {
        return readStorage(PORTAL_STORAGE_KEYS.activeLinkId);
    }

    setActiveLinkId(linkId: string | null): void {
        writeStorage(PORTAL_STORAGE_KEYS.activeLinkId, linkId);
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
