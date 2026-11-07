import type { PublicSiteResponse, SiteRequestState } from '../app/site-state';

/** Site sunucusunun ayarları: tek kaynak ortam değişkenleri, belge `docs/SITE_APP.md`. */
export interface SiteServerConfig {
    /** Sunucunun API'ye gittiği kök. */
    readonly apiBaseUrl: string;
    /** Tarayıcının görsel istediği kök; boşsa aynı alan adı. */
    readonly publicApiBaseUrl: string;
    readonly origin: string;
    /** Önümüzdeki güvenilen vekil sayısı. 0 ise `X-Forwarded-For` hiç okunmaz, soket adresi kullanılır. */
    readonly trustedProxyHops: number;
    readonly allowedHosts: readonly string[];
}

export function readSiteServerConfig(env: Readonly<Record<string, string | undefined>>): SiteServerConfig {
    const apiBaseUrl = (env['SITE_API_BASE_URL'] ?? 'https://localhost:7173').replace(/\/$/, '');

    return {
        apiBaseUrl,
        publicApiBaseUrl: (env['SITE_PUBLIC_API_BASE_URL'] ?? apiBaseUrl).replace(/\/$/, ''),
        origin: (env['SITE_PUBLIC_ORIGIN'] ?? 'https://vetinity.com').replace(/\/$/, ''),
        trustedProxyHops: Math.max(0, Number(env['SITE_TRUSTED_PROXY_HOPS'] ?? 0) || 0),
        allowedHosts: (env['SITE_ALLOWED_HOSTS'] ?? 'localhost')
            .split(',')
            .map((host) => host.trim())
            .filter(Boolean)
    };
}

export type SiteLoadResult = SiteRequestState | { readonly kind: 'redirect'; readonly slug: string };

const API_TIMEOUT_MS = 8000;

/**
 * Herkese açık ucu tek yerden çağırır. İstemci IP'si `X-Forwarded-For` ile iletilir: backend hız sınırı ziyaretçi başına işlesin (K12).
 * Bu değer gelen istekteki başlık değildir; Express'in `trust proxy` ayarından geçmiş `req.ip`'dir, ziyaretçi uyduramaz.
 */
export async function loadPublicSite(slug: string, clientIp: string | undefined, config: SiteServerConfig, fetcher: typeof fetch = fetch): Promise<SiteLoadResult> {
    let response: Response;

    try {
        response = await fetcher(`${config.apiBaseUrl}/api/v1/public/sites/${encodeURIComponent(slug)}`, {
            headers: { accept: 'application/json', ...(clientIp ? { 'x-forwarded-for': clientIp.replace(/^::ffff:/, '') } : {}) },
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });
    } catch (error) {
        console.error(`[site] API'ye ulaşılamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`);

        return { kind: 'unavailable' };
    }

    if (response.status === 404) return { kind: 'notfound' };

    if (!response.ok) {
        console.error(`[site] API yanıtı ${response.status}`);

        return { kind: 'unavailable' };
    }

    const body = (await response.json()) as PublicSiteResponse;

    switch (body.status) {
        // Sözleşme §6: kapalı sitenin eski adresi de "Closed" döner, yeni adres açıklanmaz. "Redirect" yalnız açık sitede gelir.
        case 'Redirect':
            return isRedirectTarget(body.redirectToSlug, slug) ? { kind: 'redirect', slug: body.redirectToSlug } : { kind: 'notfound' };
        case 'Closed':
            return { kind: 'closed', message: body.message };
        case 'Published':
            return { kind: 'published', slug: body.slug, config: body.config, clinic: body.clinic, onlineBooking: body.onlineBooking, publishedAtUtc: body.publishedAtUtc, imageBaseUrl: config.publicApiBaseUrl, origin: config.origin };
        default:
            return { kind: 'unavailable' };
    }
}

/** Hedef adres biçiminde olmalı ve istekteki adres olmamalı: yanıt başlığına yalnız denetlenmiş değer yazılır, döngü kurulmaz. */
function isRedirectTarget(target: string | null, slug: string): target is string {
    return !!target && target !== slug.toLowerCase() && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(target);
}

/** 301 hedefi: yalnız adres parçası değişir, alt sayfa ve sorgu korunur. */
export function redirectLocation(originalUrl: string, newSlug: string): string {
    return originalUrl.replace(/^\/k\/[^/?#]+/, `/k/${newSlug}`);
}
