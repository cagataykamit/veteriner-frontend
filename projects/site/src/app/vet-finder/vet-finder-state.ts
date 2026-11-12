import type { SiteSlot } from '@site-engine';
import { withBookingSource } from '../site-state';

/*
 * Veteriner bul (TIER-015, ADR-047). Sözleşme Veteriner `docs/VET_FINDER_API_CONTRACT.md`. Sayfalar `/veteriner/{il}/{ilçe}/{hizmet}`
 * altında sunucuda çizilir; il, ilçe ve hizmetin adres biçimi backend'den gelir, burada üretilmez. Sıralama, "şu an açık" ve dizin
 * eşiği backend kuralıdır; burası yalnız gösterir.
 */

export interface VetFinderPlace {
    readonly slug: string;
    readonly name: string;
}

export interface VetFinderServiceRef {
    readonly key: string;
    readonly name: string;
}

/** `GET /api/v1/public/vet-finder/regions` (§3). */
export interface VetFinderRegions {
    readonly totalClinics: number;
    readonly minClinicsToIndex: number;
    readonly cities: readonly {
        readonly slug: string;
        readonly name: string;
        readonly clinicCount: number;
        readonly districts: readonly { readonly slug: string; readonly name: string; readonly clinicCount: number; readonly services: readonly { readonly key: string; readonly clinicCount: number }[] }[];
    }[];
    readonly services: readonly VetFinderServiceRef[];
}

export interface VetFinderWorkingHour {
    readonly dayOfWeek: number;
    readonly isClosed: boolean;
    readonly opensAt: string | null;
    readonly closesAt: string | null;
    readonly breakStartsAt: string | null;
    readonly breakEndsAt: string | null;
}

/** Kart: kliniğin kendi verdiği bilgi (§4). */
export interface VetFinderCard {
    readonly key: string;
    readonly name: string;
    readonly city: string;
    readonly citySlug: string;
    readonly district: string | null;
    readonly districtSlug: string | null;
    readonly address: string | null;
    readonly phone: string | null;
    readonly services: readonly VetFinderServiceRef[];
    readonly workingHours: readonly VetFinderWorkingHour[];
    readonly isOpenNow: boolean;
    readonly distanceKm: number | null;
    readonly sitePath: string | null;
    readonly bookingUrl: string | null;
    readonly showsNextSlot: boolean;
}

/** `GET /api/v1/public/vet-finder/clinics` (§4). */
export interface VetFinderList {
    readonly city: VetFinderPlace | null;
    readonly district: VetFinderPlace | null;
    readonly service: VetFinderServiceRef | null;
    readonly openNow: boolean;
    readonly usesDistance: boolean;
    readonly anyClinicHasLocation: boolean;
    readonly indexable: boolean;
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly clinics: readonly VetFinderCard[];
    readonly suggestedDistricts: readonly { readonly slug: string; readonly name: string; readonly clinicCount: number }[];
}

/** `GET /api/v1/public/vet-finder/next-slots` (§5). */
export interface VetFinderNextSlots {
    readonly items: readonly { readonly key: string; readonly slot: SiteSlot | null }[];
}

/** Adresten okunan sayfa: il, ilçe ve hizmet adres biçiminde; sorgu `acik=1`, `hizmet=` (ilçe yokken), `sayfa=`. */
export interface VetFinderRoute {
    readonly city: string | null;
    readonly district: string | null;
    readonly service: string | null;
    readonly openNow: boolean;
    readonly page: number;
}

/** Sunucunun Angular'a verdiği durum; hidrasyonda tarayıcıya geçer, sayfa API'ye yeniden gitmez. */
export interface VetFinderRequestState {
    readonly kind: 'vet-finder';
    /** `notfound`: bilinmeyen il, ilçe ya da hizmet (404). `unavailable`: API'ye ulaşılamadı ya da hız sınırı (503), "yok" denmez. */
    readonly status: 'ok' | 'notfound' | 'unavailable';
    readonly route: VetFinderRoute;
    readonly regions: VetFinderRegions | null;
    readonly list: VetFinderList | null;
    /** "https://vetinity.com": kanonik adres buradan. */
    readonly origin: string;
}

export const VET_FINDER_ROOT = '/veteriner';

/** Randevu talep formu kaynak değeri (TIER-016; backend `AppointmentRequestChannels.VetFinderToken`). */
export const VET_FINDER_BOOKING_SOURCE = 'veteriner-bul';

/** Tarayıcının saat ve konumlu liste için gittiği site sunucusu uçları; API'ye tarayıcıdan gidilmez. */
export const VET_FINDER_SLOTS_PATH = `${VET_FINDER_ROOT}/_api/saatler`;
export const VET_FINDER_LIST_PATH = `${VET_FINDER_ROOT}/_api/klinikler`;

const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PAGE = 1000;

export function isVetFinderPath(pathname: string): boolean {
    return pathname === VET_FINDER_ROOT || pathname.startsWith(`${VET_FINDER_ROOT}/`);
}

/** "/veteriner/istanbul/kadikoy?acik=1" → sayfa. Biçime uymayan adres `null` (404); büyük harf ve sondaki eğik çizgi kabul edilir. */
export function parseVetFinderUrl(url: string): VetFinderRoute | null {
    const parsed = new URL(url, 'http://yerel');

    if (!isVetFinderPath(parsed.pathname.replace(/\/+$/, '') || '/')) return null;

    const segments = parsed.pathname.slice(VET_FINDER_ROOT.length).split('/').filter(Boolean).map((s) => s.toLowerCase());
    const queryService = parsed.searchParams.get('hizmet')?.trim().toLowerCase() || null;
    const page = Number(parsed.searchParams.get('sayfa') ?? 1);

    if (segments.length > 3 || !segments.every((s) => SEGMENT.test(s))) return null;
    if (segments.length === 3 && queryService) return null;
    if (queryService && !SEGMENT.test(queryService)) return null;
    if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) return null;

    return {
        city: segments[0] ?? null,
        district: segments[1] ?? null,
        service: segments[2] ?? queryService,
        openNow: parsed.searchParams.get('acik') === '1',
        page
    };
}

/** Sayfa adresi. Hizmet ilçe sayfasında yol parçasıdır, il ve kök sayfada sorgudur. */
export function vetFinderHref(route: Partial<VetFinderRoute>): string {
    const path = [VET_FINDER_ROOT, route.city, route.city ? route.district : null, route.city && route.district ? route.service : null].filter(Boolean).join('/');
    const query = new URLSearchParams();

    if (route.service && !(route.city && route.district)) query.set('hizmet', route.service);
    if (route.openNow) query.set('acik', '1');
    if (route.page && route.page > 1) query.set('sayfa', String(route.page));

    const search = query.toString();

    return search ? `${path}?${search}` : path;
}

export interface VetFinderHead {
    readonly title: string;
    readonly heading: string;
    readonly description: string;
    readonly canonical: string;
    readonly indexable: boolean;
}

/**
 * Başlık, açıklama ve kanonik adres. Metin nötrdür: üstünlük ya da karşılaştırma sözü yoktur (ADR-047 K6). Dizin (K8): backend eşiği
 * (`indexable`) ve sorgu filtresi olmayan ilk sayfa; "şu an açık", sorgudaki hizmet ve sonraki sayfalar dizine girmez, kanonik adres
 * filtresiz sayfadır.
 */
export function vetFinderHead(state: VetFinderRequestState): VetFinderHead {
    const { list, route, origin } = state;
    const place = list?.district && list.city ? `${list.district.name}, ${list.city.name}` : (list?.city?.name ?? null);
    const service = list?.service?.name ?? null;
    const heading = `${service ? `${service} · ` : ''}${place ? `${place} veteriner klinikleri` : 'Veteriner klinikleri'}`;
    const canonicalRoute = { city: list?.city?.slug ?? null, district: list?.district?.slug ?? null, service: list?.district ? (list.service?.key ?? null) : null };

    if (state.status !== 'ok' || !list) {
        return { title: 'Veteriner bul | Vetinity', heading: state.status === 'notfound' ? 'Bu bölgede listelenen klinik yok' : 'Liste şu anda açılamıyor', description: '', canonical: `${origin}${vetFinderHref(route)}`, indexable: false };
    }

    const where = list.district && list.city ? `${list.district.name} (${list.city.name}) bölgesinde` : list.city ? `${list.city.name} ilinde` : "Türkiye'de";
    const what = service ? `${service.toLocaleLowerCase('tr-TR')} hizmeti verdiğini belirten` : '';
    const count = list.total > 0 ? `${list.total} ` : '';

    return {
        title: `${heading} | Vetinity`,
        // Kök sayfa hasta sahibini karşılar; sekme başlığı ve il/ilçe/hizmet sayfalarının başlığı arama kalıbında kalır.
        heading: place || service ? heading : 'Yakınınızdaki veteriner kliniğini bulun',
        description: `${where} Vetinity'de listelenen ${what ? `${what} ` : ''}${count}veteriner kliniği: adres, telefon, çalışma saatleri ve online randevu talebi.`,
        canonical: `${origin}${vetFinderHref(canonicalRoute)}`,
        indexable: list.indexable && !route.openNow && route.page === 1 && !(route.service && !route.district)
    };
}

/** Randevu bağlantısı Veteriner bul kaynağıyla (TIER-016); saat seçilirse kart `?saat=` ekler (TIER-017). */
export function vetFinderBookingHref(bookingUrl: string): string {
    return withBookingSource(bookingUrl, VET_FINDER_BOOKING_SOURCE);
}

/** Site haritası (K8): yalnız eşiği geçen il, ilçe ve ilçe-hizmet sayfaları; kök, toplam eşiği geçerse. */
export function vetFinderSitemapPaths(regions: VetFinderRegions): string[] {
    const min = regions.minClinicsToIndex;
    const paths: string[] = regions.totalClinics >= min ? [VET_FINDER_ROOT] : [];

    for (const city of regions.cities) {
        if (city.clinicCount >= min) paths.push(vetFinderHref({ city: city.slug }));

        for (const district of city.districts) {
            if (district.clinicCount < min) continue;

            paths.push(vetFinderHref({ city: city.slug, district: district.slug }));

            for (const service of district.services) {
                if (service.clinicCount >= min) paths.push(vetFinderHref({ city: city.slug, district: district.slug, service: service.key }));
            }
        }
    }

    return paths;
}
