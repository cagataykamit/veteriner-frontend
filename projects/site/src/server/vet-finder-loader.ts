import {
    VET_FINDER_ROOT,
    type VetFinderList,
    type VetFinderNextSlots,
    type VetFinderRegions,
    type VetFinderRequestState,
    type VetFinderRoute,
    vetFinderSitemapPaths
} from '../app/vet-finder/vet-finder-state';
import { API_TIMEOUT_MS, apiHeaders, type SiteServerConfig } from './site-loader';

/*
 * Veteriner bul sayfalarının API çağrıları (Veteriner `docs/VET_FINDER_API_CONTRACT.md`). Tek kapı burası: istemci IP'si klinik
 * sitesiyle aynı yolla iletilir (`X-Forwarded-For`, Express `req.ip`), tarayıcı API'ye gitmez. Gövde ve sorgu değerleri iletilmeden
 * önce biçim denetiminden geçer; ziyaretçi konumu iki ondalığa yuvarlanır ve yalnız gövdeyle gelir (sorgu satırında, dolayısıyla
 * erişim günlüklerinde görünmez).
 */

type ApiResult<T> = { readonly ok: true; readonly body: T } | { readonly ok: false; readonly status: number };

const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY = /^[a-z0-9]{1,10}$/;
const MAX_KEYS = 24;

const EMPTY_ROUTE: VetFinderRoute = { city: null, district: null, service: null, openNow: false, page: 1 };

async function getApi<T>(path: string, clientIp: string | undefined, config: SiteServerConfig, fetcher: typeof fetch): Promise<ApiResult<T>> {
    try {
        const response = await fetcher(`${config.apiBaseUrl}${path}`, { headers: apiHeaders(clientIp), signal: AbortSignal.timeout(API_TIMEOUT_MS) });

        if (!response.ok) {
            if (response.status !== 404) console.error(`[veteriner-bul] API yanıtı ${response.status}`);

            return { ok: false, status: response.status };
        }

        return { ok: true, body: (await response.json()) as T };
    } catch (error) {
        console.error(`[veteriner-bul] API'ye ulaşılamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`);

        return { ok: false, status: 503 };
    }
}

/** Liste sorgusu; konum yalnız sunucudan sunucuya gider. */
export function clinicsQuery(route: VetFinderRoute, location?: { readonly lat: number; readonly lng: number } | null): string {
    const query = new URLSearchParams();

    if (route.city) query.set('city', route.city);
    if (route.city && route.district) query.set('district', route.district);
    if (route.service) query.set('service', route.service);
    if (route.openNow) query.set('openNow', 'true');
    if (route.page > 1) query.set('page', String(route.page));
    if (location) {
        query.set('lat', String(location.lat));
        query.set('lng', String(location.lng));
    }

    return `/api/v1/public/vet-finder/clinics?${query}`;
}

/**
 * Sayfa durumu: il listesi (gezinme ve öneriler) ve klinik listesi. Biçimsiz adres ya da bilinmeyen yer 404, ulaşılamayan API ve hız
 * sınırı 503 olur; "yok" denmez.
 */
export async function loadVetFinderPage(route: VetFinderRoute | null, clientIp: string | undefined, config: SiteServerConfig, fetcher: typeof fetch = fetch): Promise<VetFinderRequestState> {
    const base = { kind: 'vet-finder', route: route ?? EMPTY_ROUTE, origin: config.origin } as const;
    const regions = await getApi<VetFinderRegions>('/api/v1/public/vet-finder/regions', clientIp, config, fetcher);

    if (!regions.ok) return { ...base, status: 'unavailable', regions: null, list: null };
    if (!route) return { ...base, status: 'notfound', regions: regions.body, list: null };

    const list = await getApi<VetFinderList>(clinicsQuery(route), clientIp, config, fetcher);

    if (list.ok) return { ...base, status: 'ok', regions: regions.body, list: list.body };

    return { ...base, status: list.status === 404 ? 'notfound' : 'unavailable', regions: regions.body, list: null };
}

const slugOrNull = (value: unknown): string | null => (typeof value === 'string' && SEGMENT.test(value) ? value : null);
const coordinate = (value: unknown, limit: number): number | null => (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? Math.round(value * 100) / 100 : null);

/**
 * Konuma göre sıralı liste (`POST /veteriner/_api/klinikler`). Gövde yalnız bilinen alanlarla yeniden kurulur; konum yarım ya da
 * geçersizse konumsuz sorulur.
 */
export async function loadVetFinderListByBody(body: unknown, clientIp: string | undefined, config: SiteServerConfig, fetcher: typeof fetch = fetch): Promise<ApiResult<VetFinderList>> {
    const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const city = slugOrNull(input['city']);
    const page = typeof input['page'] === 'number' && Number.isInteger(input['page']) && input['page'] >= 1 && input['page'] <= 1000 ? input['page'] : 1;
    const route: VetFinderRoute = { city, district: city ? slugOrNull(input['district']) : null, service: slugOrNull(input['service']), openNow: input['openNow'] === true, page };
    const lat = coordinate(input['lat'], 90);
    const lng = coordinate(input['lng'], 180);

    return getApi<VetFinderList>(clinicsQuery(route, lat !== null && lng !== null ? { lat, lng } : null), clientIp, config, fetcher);
}

/** Kartların en yakın saati (`GET /veteriner/_api/saatler?keys=`); biçimsiz anahtar atılır, en çok bir sayfa kart. */
export async function loadVetFinderSlots(keys: unknown, clientIp: string | undefined, config: SiteServerConfig, fetcher: typeof fetch = fetch): Promise<ApiResult<VetFinderNextSlots>> {
    const list = (typeof keys === 'string' ? keys.split(',') : []).map((k) => k.trim()).filter((k) => KEY.test(k)).slice(0, MAX_KEYS);

    if (list.length === 0) return { ok: true, body: { items: [] } };

    return getApi<VetFinderNextSlots>(`/api/v1/public/vet-finder/next-slots?keys=${list.join(',')}`, clientIp, config, fetcher);
}

const escapeXml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function vetFinderSitemapXml(regions: VetFinderRegions, origin: string): string {
    const urls = vetFinderSitemapPaths(regions).map((path) => `  <url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Kök `robots.txt`'ye eklenen satırlar (canlıda tanıtım sitesinin dosyasına taşınır; `docs/SITE_APP.md`). */
export function vetFinderRobotsLines(origin: string): string {
    return `Allow: ${VET_FINDER_ROOT}/\nDisallow: ${VET_FINDER_ROOT}/_api/\nSitemap: ${origin}${VET_FINDER_ROOT}/sitemap.xml\n`;
}
