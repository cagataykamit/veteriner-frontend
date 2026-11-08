import { TestBed } from '@angular/core/testing';
import { composeSiteConfig, defaultStoredConfig } from '@site-engine';
import { loadPublicSite, readSiteServerConfig, redirectLocation, withNextSlots } from '../server/site-loader';
import { SiteHead } from './site-head';
import { sitePathFromUrl } from './site-page-host.component';
import { publishedSiteConfig, type PublicSiteResponse, type PublishedSite } from './site-state';

const CONFIG = readSiteServerConfig({ SITE_API_BASE_URL: 'https://api.example.com/', SITE_PUBLIC_ORIGIN: 'https://vetinity.com' });

const respond = (status: number, body: Partial<PublicSiteResponse> = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('readSiteServerConfig', () => {
    it('varsayılanda vekile güvenmez', () => {
        expect(CONFIG.trustedProxyHops).toBe(0);
        expect(readSiteServerConfig({ SITE_TRUSTED_PROXY_HOPS: 'abc' }).trustedProxyHops).toBe(0);
        expect(readSiteServerConfig({ SITE_TRUSTED_PROXY_HOPS: '2' }).trustedProxyHops).toBe(2);
    });

    it('görsel kökü verilmezse API köküdür; boş verilirse aynı alan adı', () => {
        expect(CONFIG.publicApiBaseUrl).toBe('https://api.example.com');
        expect(readSiteServerConfig({ SITE_PUBLIC_API_BASE_URL: '' }).publicApiBaseUrl).toBe('');
    });

    it('izinli sunucu listesi virgülle ayrılır', () => {
        expect(readSiteServerConfig({ SITE_ALLOWED_HOSTS: 'vetinity.com, www.vetinity.com' }).allowedHosts).toEqual(['vetinity.com', 'www.vetinity.com']);
    });
});

describe('loadPublicSite', () => {
    it('adresi kodlar ve istemci IP\'sini iletir', async () => {
        const fetcher = respond(404);

        await loadPublicSite('a/b', '::ffff:203.0.113.9', CONFIG, fetcher);

        const [url, init] = (fetcher as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];

        expect(url).toBe('https://api.example.com/api/v1/public/sites/a%2Fb');
        expect((init.headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.9');
    });

    it('404 "yok", hız sınırı ve sunucu hatası "açılamıyor" olur; "yok" denmez', async () => {
        expect(await loadPublicSite('a', undefined, CONFIG, respond(404))).toEqual({ kind: 'notfound' });
        expect(await loadPublicSite('a', undefined, CONFIG, respond(429))).toEqual({ kind: 'unavailable' });
        expect(await loadPublicSite('a', undefined, CONFIG, respond(500))).toEqual({ kind: 'unavailable' });
        expect(await loadPublicSite('a', undefined, CONFIG, vi.fn(async () => Promise.reject(new Error('ağ'))) as unknown as typeof fetch)).toEqual({ kind: 'unavailable' });
    });

    it('yönlendirme hedefi denetlenir: bozuk adres ve kendine dönüş yönlenmez', async () => {
        for (const target of ['a', 'https://kotu.example.com', 'b/../c', 'b\r\nSet-Cookie: x=1', null]) {
            expect(await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Redirect', redirectToSlug: target }))).toEqual({ kind: 'notfound' });
        }
    });

    it('eski adres yönlenir, kapalı site neden söylemez', async () => {
        expect(await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Redirect', redirectToSlug: 'b' }))).toEqual({ kind: 'redirect', slug: 'b' });
        expect(await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Closed', message: 'Yayında değil.' }))).toEqual({ kind: 'closed', message: 'Yayında değil.' });
    });

    it('yayındaki site görsel kökü ve siteyle gelir', async () => {
        const loaded = await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Published', slug: 'a', config: {}, clinic: null, onlineBooking: null, publishedAtUtc: null }));

        expect(loaded).toMatchObject({ kind: 'published', slug: 'a', imageBaseUrl: 'https://api.example.com', origin: 'https://vetinity.com' });
    });
});

describe('withNextSlots (TIER-017)', () => {
    const published = (pages: Record<string, boolean>, isEnabled = true): PublishedSite => ({
        kind: 'published',
        slug: 'cagri',
        config: { structure: { pages } },
        clinic: null,
        onlineBooking: { isEnabled, bookingUrl: isEnabled ? 'https://portal/randevu/k' : null },
        nextSlots: [],
        publishedAtUtc: null,
        imageBaseUrl: '',
        origin: 'https://vetinity.com'
    });
    const slots = [{ date: '2026-11-09', startUtc: '2026-11-09T06:00:00Z' }];
    const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

    it('randevu sayfası ve online randevu açıksa saatleri istemci IP\'siyle sorar', async () => {
        const fetcher = answer(200, { slots });

        const loaded = await withNextSlots(published({ randevu: true }), '203.0.113.9', CONFIG, fetcher);

        const [url, init] = (fetcher as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];

        expect(url).toBe('https://api.example.com/api/v1/public/sites/cagri/next-available-slots');
        expect((init.headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.9');
        expect(loaded.nextSlots).toEqual(slots);
    });

    it('randevu sayfası ya da online randevu kapalıysa sormaz', async () => {
        const fetcher = answer(200, { slots });

        expect((await withNextSlots(published({ randevu: false }), undefined, CONFIG, fetcher)).nextSlots).toEqual([]);
        expect((await withNextSlots(published({ randevu: true }, false), undefined, CONFIG, fetcher)).nextSlots).toEqual([]);
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('hata, hız sınırı ya da bozuk yanıtta saatsiz devam eder', async () => {
        const site = published({ randevu: true });

        expect((await withNextSlots(site, undefined, CONFIG, answer(429, {}))).nextSlots).toEqual([]);
        expect((await withNextSlots(site, undefined, CONFIG, answer(200, { slots: 'x' }))).nextSlots).toEqual([]);
        expect((await withNextSlots(site, undefined, CONFIG, vi.fn(async () => Promise.reject(new Error('ağ'))) as unknown as typeof fetch)).nextSlots).toEqual([]);
    });
});

describe('redirectLocation', () => {
    it('alt sayfayı ve sorguyu korur', () => {
        expect(redirectLocation('/k/eski/hizmetler?x=1', 'yeni')).toBe('/k/yeni/hizmetler?x=1');
        expect(redirectLocation('/k/ESKI', 'yeni')).toBe('/k/yeni');
    });
});

describe('publishedSiteConfig', () => {
    const stored = defaultStoredConfig();
    const site: PublishedSite = {
        kind: 'published',
        slug: 'cagri',
        config: { ...stored, content: { ...stored.content, heroImage: { src: 'site-image:g1', alt: 'Köpek' } } },
        clinic: { name: 'Çağrı', city: 'Ankara', district: null, address: 'Adres', phone: '0312', email: null, workingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: '09:00:00', closesAt: '18:00:00', breakStartsAt: null, breakEndsAt: null }] },
        onlineBooking: { isEnabled: true, bookingUrl: 'https://portal/randevu/k' },
        nextSlots: [{ date: '2026-11-09', startUtc: '2026-11-09T06:00:00Z' }],
        publishedAtUtc: null,
        imageBaseUrl: 'https://api.example.com',
        origin: 'https://vetinity.com'
    };

    it('en yakın saatler klinik kaydıyla motora gider (TIER-017)', () => {
        expect(publishedSiteConfig(site).content.clinic.nextSlots).toEqual(site.nextSlots);
    });

    it('klinik kaydı birleşir, görsel herkese açık uca çözülür', () => {
        const config = publishedSiteConfig(site);

        expect(config.content.heroImage?.src).toBe('https://api.example.com/api/v1/public/sites/cagri/images/g1');
        expect(config.content.clinic.name).toBe('Çağrı');
        expect(config.content.clinic.district).toBe('');
        expect(config.content.clinic.workingDays[0].opensAt).toBe('09:00');
        expect(config.content.clinic.bookingUrl).toBe('https://portal/randevu/k');
    });

    it('online randevu kapalıysa bağlantı taşınmaz', () => {
        expect(publishedSiteConfig({ ...site, onlineBooking: { isEnabled: false, bookingUrl: 'https://portal/randevu/k' } }).content.clinic.bookingUrl).toBeNull();
    });
});

describe('SiteHead paylaşım görseli', () => {
    const RECORD = { name: 'Çağrı', city: 'Ankara', district: '', address: '', phone: '', email: '', workingDays: [], bookingUrl: null, nextSlots: [] };
    const ogImage = (hero: string | null): string | null => {
        const stored = defaultStoredConfig('premium');
        const config = composeSiteConfig({ ...stored, content: { ...stored.content, heroImage: hero ? { src: hero, alt: 'x' } : null } }, RECORD, 'cagri');

        TestBed.inject(SiteHead).applyPublished(config, '/', 'https://vetinity.com');

        return document.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null;
    };

    it('klinik görsel yüklemediyse hazır fotoğraf sitenin tabanından tam adres olur', () => {
        expect(ogImage(null)).toBe('https://vetinity.com/k/_stock/tuxedo-dark.webp');
    });

    it('kök göreli ve tam adresli görsel olduğu gibi kalır', () => {
        expect(ogImage('/api/v1/public/sites/cagri/images/g1')).toBe('https://vetinity.com/api/v1/public/sites/cagri/images/g1');
        expect(ogImage('https://api.example.com/g1')).toBe('https://api.example.com/g1');
    });
});

describe('sitePathFromUrl', () => {
    it.each([
        ['/cagri', '/'],
        ['/cagri/hizmetler', '/hizmetler'],
        ['/cagri/hizmetler/asi', '/hizmetler/asi'],
        ['/cagri#services', '/#services'],
        ['/cagri/hakkimizda?x=1', '/hakkimizda']
    ])('%s → %s', (url, path) => {
        expect(sitePathFromUrl(url)).toBe(path);
    });
});
