import { composeSiteConfig, readStoredConfig, resolveSiteImages, type SiteConfig, type SiteSlot, toWorkingDays } from '@site-engine';

/** `GET /api/v1/public/sites/{slug}` yanıtı (Veteriner `docs/CLINIC_SITE_API_CONTRACT.md` §6). Duruma uymayan alanlar `null`. */
export interface PublicSiteResponse {
    readonly status: 'Published' | 'Redirect' | 'Closed';
    readonly slug: string;
    readonly redirectToSlug: string | null;
    readonly message: string | null;
    readonly publishedAtUtc: string | null;
    readonly config: unknown;
    readonly clinic: {
        readonly name: string | null;
        readonly city: string | null;
        readonly district: string | null;
        readonly address: string | null;
        readonly phone: string | null;
        readonly email: string | null;
        readonly workingHours: readonly { dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null; breakStartsAt: string | null; breakEndsAt: string | null }[] | null;
    } | null;
    readonly onlineBooking: { readonly isEnabled: boolean; readonly bookingUrl: string | null } | null;
}

/** `GET /api/v1/public/sites/{slug}/next-available-slots` yanıtı (Veteriner `docs/ONLINE_APPOINTMENT_API_CONTRACT.md` §12). */
export interface PublicNextSlotsResponse {
    readonly slots: readonly SiteSlot[];
}

export type PublishedSite = Pick<PublicSiteResponse, 'slug' | 'config' | 'clinic' | 'onlineBooking' | 'publishedAtUtc'> & {
    readonly kind: 'published';
    /** En yakın müsait saatler (TIER-017); alınamazsa boş, site yine çizilir. */
    readonly nextSlots: readonly SiteSlot[];
    /** Tarayıcının görsel istediği API kökü; boşsa aynı alan adı. */
    readonly imageBaseUrl: string;
    /** Site kökü: "https://vetinity.com". Canonical, OG ve JSON-LD adresleri buradan üretilir. */
    readonly origin: string;
};

/** Sunucunun Angular'a verdiği istek durumu; hidrasyonda tarayıcıya aktarılır, tarayıcı API'ye yeniden gitmez. */
export type SiteRequestState =
    | PublishedSite
    /** Kapalı: geçici ya da abonelik, neden söylenmez (K13). */
    | { readonly kind: 'closed'; readonly message: string | null }
    | { readonly kind: 'notfound' }
    /** API'ye ulaşılamadı ya da hız sınırına takıldı: "yok" denmez. */
    | { readonly kind: 'unavailable' };

/**
 * Talep formuna kaynak değeri eklenir (TIER-016, Veteriner `docs/ONLINE_APPOINTMENT_API_CONTRACT.md` §14): form bunu talebe taşır,
 * sunucu yalnız izinli değeri sayar (`site`, `veteriner-bul`). Okunamayan adres olduğu gibi kalır; motor onu zaten göstermez.
 */
export function withBookingSource(bookingUrl: string, source: string): string {
    try {
        const url = new URL(bookingUrl);

        url.searchParams.set('kaynak', source);

        return url.href;
    } catch {
        return bookingUrl;
    }
}

export function withSiteBookingSource(bookingUrl: string): string {
    return withBookingSource(bookingUrl, 'site');
}

/** Klinik kaydı + yayınlanmış yapılandırma → motorun çizdiği yapılandırma. Görsel başvuruları herkese açık uca çözülür (sözleşme §6). */
export function publishedSiteConfig(site: PublishedSite): SiteConfig {
    const { clinic, onlineBooking } = site;
    const config = composeSiteConfig(
        readStoredConfig(site.config),
        {
            name: clinic?.name ?? '',
            city: clinic?.city ?? '',
            district: clinic?.district ?? '',
            address: clinic?.address ?? '',
            phone: clinic?.phone ?? '',
            email: clinic?.email ?? '',
            workingDays: toWorkingDays(clinic?.workingHours ?? []),
            bookingUrl: onlineBooking?.isEnabled && onlineBooking.bookingUrl ? withSiteBookingSource(onlineBooking.bookingUrl) : null,
            nextSlots: site.nextSlots
        },
        site.slug
    );

    return resolveSiteImages(config, (id) => `${site.imageBaseUrl}/api/v1/public/sites/${encodeURIComponent(site.slug)}/images/${encodeURIComponent(id)}`);
}
