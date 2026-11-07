import { defaultStoredConfig } from '@site-engine';
import { loadPublicSite, readSiteServerConfig, redirectLocation } from '../server/site-loader';
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

    it('eski adres yönlenir, kapalı site neden söylemez', async () => {
        expect(await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Redirect', redirectToSlug: 'b' }))).toEqual({ kind: 'redirect', slug: 'b' });
        expect(await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Closed', message: 'Yayında değil.' }))).toEqual({ kind: 'closed', message: 'Yayında değil.' });
    });

    it('yayındaki site görsel kökü ve siteyle gelir', async () => {
        const loaded = await loadPublicSite('a', undefined, CONFIG, respond(200, { status: 'Published', slug: 'a', config: {}, clinic: null, onlineBooking: null, publishedAtUtc: null }));

        expect(loaded).toMatchObject({ kind: 'published', slug: 'a', imageBaseUrl: 'https://api.example.com', origin: 'https://vetinity.com' });
    });
});

describe('redirectLocation', () => {
    it('alt sayfayı ve sorguyu korur', () => {
        expect(redirectLocation('/k/eski/hizmetler?x=1', 'eski', 'yeni')).toBe('/k/yeni/hizmetler?x=1');
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
        publishedAtUtc: null,
        imageBaseUrl: 'https://api.example.com',
        origin: 'https://vetinity.com'
    };

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
