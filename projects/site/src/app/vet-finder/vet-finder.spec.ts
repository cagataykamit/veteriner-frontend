import { TestBed } from '@angular/core/testing';
import { readSiteServerConfig } from '../../server/site-loader';
import { clinicsQuery, loadVetFinderListByBody, loadVetFinderPage, loadVetFinderSlots, vetFinderRobotsLines, vetFinderSitemapXml } from '../../server/vet-finder-loader';
import { VetFinderPageComponent } from './vet-finder-page.component';
import {
    isVetFinderPath,
    parseVetFinderUrl,
    vetFinderBookingHref,
    vetFinderHead,
    vetFinderHref,
    vetFinderSitemapPaths,
    type VetFinderCard,
    type VetFinderList,
    type VetFinderRegions,
    type VetFinderRequestState
} from './vet-finder-state';

const CONFIG = readSiteServerConfig({ SITE_API_BASE_URL: 'https://api.example.com/', SITE_PUBLIC_ORIGIN: 'https://vetinity.com' });

const REGIONS: VetFinderRegions = {
    totalClinics: 4,
    minClinicsToIndex: 3,
    cities: [
        {
            slug: 'istanbul',
            name: 'İstanbul',
            clinicCount: 4,
            districts: [
                { slug: 'kadikoy', name: 'Kadıköy', clinicCount: 3, services: [{ key: 'asi', clinicCount: 3 }, { key: 'cerrahi', clinicCount: 1 }] },
                { slug: 'uskudar', name: 'Üsküdar', clinicCount: 1, services: [] }
            ]
        }
    ],
    services: [
        { key: 'asi', name: 'Aşı' },
        { key: 'cerrahi', name: 'Cerrahi' }
    ]
};

const card = (over: Partial<VetFinderCard> = {}): VetFinderCard => ({
    key: 'k000000001',
    name: 'Patiler Veteriner',
    city: 'İstanbul',
    citySlug: 'istanbul',
    district: 'Kadıköy',
    districtSlug: 'kadikoy',
    address: 'Moda Cad. 1',
    phone: '0555 000 00 00',
    services: [{ key: 'asi', name: 'Aşı' }],
    workingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: '09:00:00', closesAt: '18:00:00', breakStartsAt: null, breakEndsAt: null }],
    isOpenNow: true,
    distanceKm: null,
    sitePath: '/k/patiler',
    bookingUrl: 'https://portal.example.com/randevu/abc',
    showsNextSlot: true,
    ...over
});

const list = (over: Partial<VetFinderList> = {}): VetFinderList => ({
    city: { slug: 'istanbul', name: 'İstanbul' },
    district: { slug: 'kadikoy', name: 'Kadıköy' },
    service: null,
    openNow: false,
    usesDistance: false,
    anyClinicHasLocation: false,
    indexable: true,
    total: 3,
    page: 1,
    pageSize: 24,
    clinics: [card()],
    suggestedDistricts: [],
    ...over
});

const state = (over: Partial<VetFinderRequestState> = {}): VetFinderRequestState => ({
    kind: 'vet-finder',
    status: 'ok',
    route: { city: 'istanbul', district: 'kadikoy', service: null, openNow: false, page: 1 },
    regions: REGIONS,
    list: list(),
    origin: 'https://vetinity.com',
    ...over
});

const respond = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const calls = (fetcher: typeof fetch) => (fetcher as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;

describe('Veteriner bul adresleri', () => {
    it('yol ve sorgu okunur; büyük harf ve sondaki eğik çizgi kabul edilir', () => {
        expect(parseVetFinderUrl('/veteriner')).toEqual({ city: null, district: null, service: null, openNow: false, page: 1 });
        expect(parseVetFinderUrl('/veteriner/Istanbul/kadikoy/asi/?acik=1&sayfa=2')).toEqual({ city: 'istanbul', district: 'kadikoy', service: 'asi', openNow: true, page: 2 });
        expect(parseVetFinderUrl('/veteriner/istanbul?hizmet=asi')).toEqual({ city: 'istanbul', district: null, service: 'asi', openNow: false, page: 1 });
    });

    it('biçimsiz adres 404 olur', () => {
        for (const url of ['/veteriner/a/b/c/d', '/veteriner/kad%C4%B1k%C3%B6y', '/veteriner/a_b', '/veteriner/a?sayfa=0', '/veteriner/a/b/c?hizmet=asi', '/veterinerler']) {
            expect(parseVetFinderUrl(url), url).toBeNull();
        }

        expect(isVetFinderPath('/veterinerler')).toBe(false);
        expect(isVetFinderPath('/veteriner/istanbul')).toBe(true);
    });

    it('hizmet ilçede yol, il ve kökte sorgudur', () => {
        expect(vetFinderHref({ city: 'istanbul', district: 'kadikoy', service: 'asi' })).toBe('/veteriner/istanbul/kadikoy/asi');
        expect(vetFinderHref({ city: 'istanbul', service: 'asi', openNow: true, page: 2 })).toBe('/veteriner/istanbul?hizmet=asi&acik=1&sayfa=2');
        expect(vetFinderHref({ district: 'kadikoy' })).toBe('/veteriner');
    });

    it('randevu bağlantısı Veteriner bul kaynağını taşır', () => {
        expect(vetFinderBookingHref('https://portal.example.com/randevu/abc')).toBe('https://portal.example.com/randevu/abc?kaynak=veteriner-bul');
    });
});

describe('vetFinderHead', () => {
    it('başlık nötr, kanonik filtresiz sayfa; eşiği geçen ilk sayfa dizine girer', () => {
        const head = vetFinderHead(state());

        expect(head.title).toBe('Kadıköy, İstanbul veteriner klinikleri | Vetinity');
        expect(head.description).toContain("Kadıköy (İstanbul) bölgesinde Vetinity'de listelenen 3 veteriner kliniği");
        expect(head.canonical).toBe('https://vetinity.com/veteriner/istanbul/kadikoy');
        expect(head.indexable).toBe(true);
        expect(`${head.title} ${head.description}`).not.toMatch(/en iyi|en ucuz|bir numara|1 numara/i);
    });

    it('az klinik, şu an açık, sonraki sayfa ve sorgudaki hizmet dizine girmez', () => {
        expect(vetFinderHead(state({ list: list({ indexable: false }) })).indexable).toBe(false);
        expect(vetFinderHead(state({ route: { ...state().route, openNow: true } })).indexable).toBe(false);
        expect(vetFinderHead(state({ route: { ...state().route, page: 2 } })).indexable).toBe(false);

        const cityService = state({ route: { city: 'istanbul', district: null, service: 'asi', openNow: false, page: 1 }, list: list({ district: null, service: { key: 'asi', name: 'Aşı' } }) });

        expect(vetFinderHead(cityService).indexable).toBe(false);
        expect(vetFinderHead(cityService).canonical).toBe('https://vetinity.com/veteriner/istanbul');
    });

    it('bulunamayan ve açılamayan sayfa dizine girmez', () => {
        expect(vetFinderHead(state({ status: 'notfound', list: null })).indexable).toBe(false);
        expect(vetFinderHead(state({ status: 'unavailable', list: null, regions: null })).heading).toBe('Liste şu anda açılamıyor');
    });
});

describe('Veteriner bul site haritası ve robots', () => {
    it('yalnız eşiği geçen sayfalar girer', () => {
        expect(vetFinderSitemapPaths(REGIONS)).toEqual(['/veteriner', '/veteriner/istanbul', '/veteriner/istanbul/kadikoy', '/veteriner/istanbul/kadikoy/asi']);
        expect(vetFinderSitemapXml(REGIONS, 'https://vetinity.com')).toContain('<loc>https://vetinity.com/veteriner/istanbul/kadikoy/asi</loc>');
        expect(vetFinderRobotsLines('https://vetinity.com')).toContain('Sitemap: https://vetinity.com/veteriner/sitemap.xml');
    });
});

describe('Veteriner bul yükleyici', () => {
    it('il listesi ve klinik listesi istemci IP\'siyle sorulur', async () => {
        const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('regions') ? REGIONS : list()), { status: 200 })) as unknown as typeof fetch;

        const loaded = await loadVetFinderPage(parseVetFinderUrl('/veteriner/istanbul/kadikoy?acik=1'), '::ffff:203.0.113.9', CONFIG, fetcher);

        expect(loaded.status).toBe('ok');
        expect(calls(fetcher)[1][0]).toBe('https://api.example.com/api/v1/public/vet-finder/clinics?city=istanbul&district=kadikoy&openNow=true');
        expect((calls(fetcher)[1][1].headers as Record<string, string>)['x-forwarded-for']).toBe('203.0.113.9');
    });

    it('bilinmeyen yer 404, hız sınırı ve ağ hatası "açılamıyor" olur', async () => {
        const notFound = vi.fn(async (url: string) => new Response(JSON.stringify(REGIONS), { status: url.includes('regions') ? 200 : 404 })) as unknown as typeof fetch;

        expect((await loadVetFinderPage(parseVetFinderUrl('/veteriner/yok'), undefined, CONFIG, notFound)).status).toBe('notfound');
        expect((await loadVetFinderPage(null, undefined, CONFIG, respond(200, REGIONS))).status).toBe('notfound');
        expect((await loadVetFinderPage(parseVetFinderUrl('/veteriner'), undefined, CONFIG, respond(429))).status).toBe('unavailable');
        expect((await loadVetFinderPage(parseVetFinderUrl('/veteriner'), undefined, CONFIG, vi.fn(async () => Promise.reject(new Error('ağ'))) as unknown as typeof fetch)).status).toBe('unavailable');
    });

    it('konumlu liste gövdeden kurulur: konum yuvarlanır, bilinmeyen alan ve biçimsiz değer atılır', async () => {
        const fetcher = respond(200, list());

        await loadVetFinderListByBody({ city: 'istanbul', district: '../x', service: 'asi', page: 2, lat: 41.012345, lng: 29.0789, tenantId: 'x' }, undefined, CONFIG, fetcher);

        expect(calls(fetcher)[0][0]).toBe('https://api.example.com/api/v1/public/vet-finder/clinics?city=istanbul&service=asi&page=2&lat=41.01&lng=29.08');

        await loadVetFinderListByBody({ city: 'istanbul', lat: 41 }, undefined, CONFIG, fetcher);

        expect(calls(fetcher)[1][0]).not.toContain('lat=');
        expect(clinicsQuery({ city: null, district: 'kadikoy', service: null, openNow: false, page: 1 })).toBe('/api/v1/public/vet-finder/clinics?');
    });

    it('en yakın saat anahtarları denetlenir, en çok 24', async () => {
        const fetcher = respond(200, { items: [] });
        const keys = ['abc', 'BAD!', ...Array.from({ length: 30 }, (_, i) => `k${i}`)].join(',');

        await loadVetFinderSlots(keys, undefined, CONFIG, fetcher);

        const url = new URL(calls(fetcher)[0][0]);

        expect(url.searchParams.get('keys')!.split(',')).toHaveLength(24);
        expect(url.searchParams.get('keys')).not.toContain('BAD');
        expect(await loadVetFinderSlots(undefined, undefined, CONFIG, fetcher)).toEqual({ ok: true, body: { items: [] } });
    });
});

describe('VetFinderPageComponent', () => {
    const render = async (value: VetFinderRequestState) => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [{ key: 'k000000001', slot: { date: '2026-11-09', startUtc: '2026-11-09T07:30:00Z' } }] }), { status: 200 })));
        const fixture = TestBed.createComponent(VetFinderPageComponent);

        fixture.componentRef.setInput('state', value);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return { fixture, host: fixture.nativeElement as HTMLElement };
    };

    afterEach(() => vi.unstubAllGlobals());

    it('kart kliniğin bilgisini, kaynaklı randevu bağlantısını ve en yakın saati gösterir', async () => {
        const { fixture, host } = await render(state());

        expect(host.querySelector('h1')?.textContent).toContain('Kadıköy, İstanbul veteriner klinikleri');
        expect(host.querySelector('.vf-status')?.textContent).toContain('Şu an açık');
        expect(host.querySelector<HTMLAnchorElement>('.vf-btn-primary')?.href).toBe('https://portal.example.com/randevu/abc?kaynak=veteriner-bul');
        expect(host.querySelector<HTMLAnchorElement>('a[href="tel:05550000000"]')).not.toBeNull();
        // Saat sayfa çizildikten sonra site sunucusundan tek istekle gelir.
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(host.querySelector<HTMLAnchorElement>('.vf-slot a')?.href).toBe('https://portal.example.com/randevu/abc?kaynak=veteriner-bul&saat=2026-11-09T07%3A30%3A00Z');
        });
        expect(vi.mocked(fetch)).toHaveBeenCalledWith('/veteriner/_api/saatler?keys=k000000001', expect.anything());
        expect(host.querySelector('.vf-how')?.textContent).toContain('Sıra ödemeyle değişmez');
        expect(host.textContent).not.toMatch(/en iyi|puan:|yorum yaz/i);
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    });

    it('sonuç yoksa yakın ilçe önerir ve filtreyi kaldırma bağlantısı verir', async () => {
        const { host } = await render(
            state({ list: list({ total: 0, clinics: [], service: { key: 'cerrahi', name: 'Cerrahi' }, indexable: false, district: { slug: 'uskudar', name: 'Üsküdar' }, suggestedDistricts: [{ slug: 'kadikoy', name: 'Kadıköy', clinicCount: 1 }] }) })
        );

        expect(host.querySelector('.vf-empty a[href="/veteriner/istanbul/kadikoy/cerrahi"]')).not.toBeNull();
        expect(host.querySelector('.vf-empty a[href="/veteriner/istanbul/uskudar"]')?.textContent).toContain('Filtreleri kaldır');
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    });
});
