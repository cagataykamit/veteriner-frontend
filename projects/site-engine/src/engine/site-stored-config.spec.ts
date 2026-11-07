import { sampleConfig } from '../testing/site-sample';
import { clinicStatus, hoursGroups, istanbulClock } from './site-hours';
import { safeHref, safeImageSrc, socialLinks } from './site-links';
import { siteJsonLd, sitePageHead, sitePagePaths, siteRootUrl, siteSitemapXml, seoDescription } from './site-seo';
import { composeSiteConfig, defaultStoredConfig, readStoredConfig, resolveSiteImages, siteImageId, toWorkingDays, usedSiteImageIds } from './site-stored-config';
import { showsStockPhotoNote } from './stock-photos';
import { buildSiteVm } from './site-vm';
import { conceptByKey } from './site-concepts';

const RECORD = { name: 'Çağrı', city: 'Ankara', district: 'Çankaya', address: 'Adres', phone: '0312', email: 'a@example.com', workingDays: [], bookingUrl: null };

describe('saklanan yapılandırma (K8)', () => {
    it('yeni site boş başlar, kliniğe dair bir şey varsaymaz', () => {
        const { content, schemaVersion, seo } = defaultStoredConfig();

        expect(schemaVersion).toBe(1);
        expect(content.services).toEqual([]);
        expect(content.members).toEqual([]);
        expect(content.copy.heroTitle).toBe('');
        expect(seo).not.toHaveProperty('slug');
    });

    it.each(['name', 'phone', 'email', 'address', 'district', 'city', 'workingDays', 'workingHours', 'bookingUrl'])('klinik kaydı alanı "%s" saklanan yapılandırmada bulunmaz', (key) => {
        const stored = defaultStoredConfig();

        expect(stored.content.clinic).not.toHaveProperty(key);
        expect(readStoredConfig({ ...stored, content: { ...stored.content, clinic: { ...stored.content.clinic, [key]: 'x' } } }).content.clinic).not.toHaveProperty(key);
    });

    it('bozuk ya da eski yapılandırma varsayılana döner, çizim kırılmaz', () => {
        for (const raw of [null, 'metin', 12, { content: 'x' }, { design: { conceptKey: 'yok' }, structure: { homeSections: 'x' } }]) {
            const stored = readStoredConfig(raw);

            expect(() => buildSiteVm(composeSiteConfig(stored, RECORD, 'adres'), conceptByKey(stored.design.conceptKey).voice, new Date())).not.toThrow();
        }
    });

    it('eksik metin anahtarı boş döner; bilinen bölüm seçimi korunur', () => {
        const stored = defaultStoredConfig('friendly');
        const read = readStoredConfig({ ...stored, content: { ...stored.content, copy: { heroTitle: 'Başlık' } }, design: { ...stored.design, sections: { hero: 'nature' } } });

        expect(read.content.copy.heroTitle).toBe('Başlık');
        expect(read.content.copy.aboutText).toBe('');
        expect(read.design.sections.hero).toBe('nature');
        expect(read.design.sections.team).toBe('friendly');
    });

    it('klinik kaydı ve adres çizimde birleşir', () => {
        const config = composeSiteConfig(defaultStoredConfig(), { ...RECORD, bookingUrl: 'https://portal/randevu/k' }, 'cagri');

        expect(config.content.clinic.name).toBe('Çağrı');
        expect(config.content.clinic.bookingUrl).toBe('https://portal/randevu/k');
        expect(config.seo.slug).toBe('cagri');
        expect(config).not.toHaveProperty('schemaVersion');
    });

    it('API saatleri "HH:mm" olur', () => {
        expect(toWorkingDays([{ dayOfWeek: 1, isClosed: false, opensAt: '09:00:00', closesAt: '18:30:00', breakStartsAt: null, breakEndsAt: null }])[0]).toEqual({ dayOfWeek: 1, isClosed: false, opensAt: '09:00', closesAt: '18:30', breakStartsAt: null, breakEndsAt: null });
    });
});

describe('görsel başvuruları', () => {
    const value = { hero: { src: 'site-image:abc-1', alt: 'site-image:x y' }, list: ['site-image:abc-2', 'stock:a'], none: null };

    it('başvuru çözülür, çözülemeyen boşa düşer, cümle içindeki metne dokunulmaz', () => {
        const resolved = resolveSiteImages(value, (id) => (id === 'abc-1' ? `/g/${id}` : null));

        expect(resolved.hero).toEqual({ src: '/g/abc-1', alt: 'site-image:x y' });
        expect(resolved.list).toEqual(['', 'stock:a']);
    });

    it('kullanılan görseller tekilleşir', () => {
        expect(usedSiteImageIds({ ...value, again: 'site-image:abc-1' })).toEqual(['abc-1', 'abc-2']);
        expect(siteImageId('https://x')).toBeNull();
    });

    it('motor başvuruyu ve stok anahtarını çizmez; panel önizlemesinin blob adresini kabul eder', () => {
        expect(safeImageSrc('site-image:abc')).toBeNull();
        expect(safeImageSrc('stock:a')).toBeNull();
        expect(safeImageSrc('blob:http://localhost:4200/abc')).toBe('blob:http://localhost:4200/abc');
        expect(safeImageSrc('blob:javascript:alert(1)')).toBeNull();
    });
});

describe('bağlantı ve görsel adresi denetimi', () => {
    const BOM = '\uFEFF';
    const ZWSP = '\u200B';

    it.each([`${BOM}javascript:alert(1)`, `${ZWSP}javascript:alert(1)`, `java${ZWSP}script:alert(1)`, `${BOM}https://example.com`, `https://exa${ZWSP}mple.com`, '  javascript:alert(1)  ', 'java\nscript:alert(1)', '\tjavascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x'])('%j bağlantı olmaz', (value) => {
        expect(safeHref(value)).toBeNull();
    });

    it('şema kırpılmış değerde denetlenir, güvenli adres kalır', () => {
        expect(safeHref('  https://example.com/a  ')).toBe('https://example.com/a');
        expect(safeHref('tel:0312')).toBe('tel:0312');
    });

    it.each(['/\\kotu.example.com/a.png', '//kotu.example.com/a.png', '/\t/kotu.example.com/a.png', `${BOM}/a.png`, 'data:image/svg+xml;base64,AAAA', 'javascript:alert(1)'])('%j görsel olmaz', (value) => {
        expect(safeImageSrc(value)).toBeNull();
    });

    it('güvensiz harita bağlantısı çizilmez, adresten üretilen bağlantıya döner', () => {
        const base = sampleConfig();
        const vm = buildSiteVm({ ...base, content: { ...base.content, clinic: { ...base.content.clinic, mapUrl: `${BOM}javascript:alert(1)` } } }, conceptByKey('modern').voice, new Date());

        expect(vm.mapHref?.startsWith('https://www.google.com/maps/search/')).toBe(true);
    });

    it('sosyal bağlantılarda biçim karakteri reddedilir', () => {
        const clinic = { ...sampleConfig().content.clinic, website: `${BOM}javascript:alert(1)`, instagram: `${ZWSP}kullanici`, facebook: 'https://facebook.com/klinik' };

        expect(socialLinks(clinic).map((link) => link.key)).toEqual(['facebook']);
    });

    it('sayfa başı güvensiz görseli yazmaz', () => {
        const base = sampleConfig();
        const head = sitePageHead({ ...base, seo: { ...base.seo, ogImage: 'javascript:alert(1)', favicon: '//kotu.example.com/i.png' }, content: { ...base.content, heroImage: null, clinic: { ...base.content.clinic, logo: null } } }, '/');

        expect(head.imageSrc).toBeNull();
        expect(head.iconSrc).toBeNull();
    });
});

describe('İstanbul saati (K12)', () => {
    const week = [{ dayOfWeek: 1, isClosed: false, opensAt: '09:00', closesAt: '18:00', breakStartsAt: null, breakEndsAt: null }];

    it('sunucu saat diliminden bağımsız hesaplanır', () => {
        // 2026-11-09 Pazartesi 06:30 UTC = İstanbul 09:30; 2026-11-08 22:00 UTC = İstanbul Pazartesi 01:00.
        expect(istanbulClock(new Date(Date.UTC(2026, 10, 9, 6, 30)))).toEqual({ day: 1, minute: 570 });
        expect(istanbulClock(new Date(Date.UTC(2026, 10, 8, 22, 0)))).toEqual({ day: 1, minute: 60 });
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 6, 30))).state).toBe('open');
        expect(clinicStatus(week, new Date(Date.UTC(2026, 10, 9, 15, 30))).state).toBe('closed');
        expect(hoursGroups(week, new Date(Date.UTC(2026, 10, 8, 22, 0))).find((group) => group.label === 'Pazartesi')?.isToday).toBe(true);
    });
});

describe('arama çıktıları', () => {
    const config = sampleConfig();

    it('adres köke göre yazılır, sonda bölü olmaz', () => {
        expect(siteRootUrl('https://vetinity.com/', 'çağrı')).toBe('https://vetinity.com/k/%C3%A7a%C4%9Fr%C4%B1');
    });

    it('alt sayfa kendi başlığını, ana sayfa SEO başlığını kullanır; bulunamayan söylenir', () => {
        expect(sitePageHead(config, '/').title).toContain(config.content.clinic.name);
        expect(sitePageHead(config, '/hizmetler/genel-muayene').title).toContain('Genel muayene');
        expect(sitePageHead(config, '/hizmetler/genel-muayene').description).toContain('Tartı');
        expect(sitePageHead(config, '/yok').found).toBe(false);
    });

    it('site haritası yalnız açık sayfaları taşır, metin kaçırılır', () => {
        const closed = { ...config, structure: { ...config.structure, pages: { ...config.structure.pages, galeri: false } } };
        const xml = siteSitemapXml({ ...closed, seo: { ...closed.seo, slug: 'a&b' } }, 'https://v.com', '2026-11-07T13:37:00.78');

        expect(sitePagePaths(closed)).not.toContain('/galeri');
        expect(sitePagePaths(closed)).toContain('/hizmetler/genel-muayene');
        expect(xml).toContain('<lastmod>2026-11-07</lastmod>');
        expect(xml).not.toContain('<loc>https://v.com/k/a&b');
    });

    it('JSON-LD VeterinaryCare\'dir, script bloğunu kapatamaz', () => {
        const json = siteJsonLd({ ...config, content: { ...config.content, clinic: { ...config.content.clinic, name: '</script><b>' } } }, 'https://v.com');

        expect(json).not.toContain('</script>');
        expect(JSON.parse(json)).toMatchObject({ '@type': 'VeterinaryCare', name: '</script><b>', address: { addressCountry: 'TR' } });
    });

    it('açıklama yoksa iddia içermeyen genel cümle yazılır (K14)', () => {
        const empty = composeSiteConfig(defaultStoredConfig(), RECORD, 'a');

        expect(seoDescription(empty)).toBe('Çağrı, Çankaya, Ankara: adres, telefon ve çalışma saatleri.');
    });
});

describe('randevu düğmesi (K11)', () => {
    const vm = (bookingUrl: string | null, phone = '0312 000 00 00') => {
        const base = sampleConfig();

        return buildSiteVm({ ...base, content: { ...base.content, clinic: { ...base.content.clinic, bookingUrl, phone } } }, conceptByKey('modern').voice, new Date());
    };

    it('online randevu açıksa talep formuna gider', () => {
        expect(vm('https://portal.example.com/randevu/kod').cta).toEqual({ label: 'Randevu al', path: null, href: 'https://portal.example.com/randevu/kod' });
    });

    it('kapalıysa telefona döner, telefon da yoksa çizilmez', () => {
        expect(vm(null).cta?.href).toBe('tel:03120000000');
        expect(vm(null, '').cta).toBeNull();
    });

    it('güvensiz bağlantı düğme olmaz', () => {
        expect(vm('javascript:alert(1)').bookingHref).toBeNull();
    });
});

describe('temsili görsel ibaresi (K7)', () => {
    const photo = { src: '/s.jpg', alt: '', source: 'kaynak', license: 'lisans' };

    it('set boşken görünmez; hazır fotoğraf çizilen yerde görünür', () => {
        expect(showsStockPhotoNote(null, null, {})).toBe(false);
        expect(showsStockPhotoNote(null, photo, { 'modern-hero': photo })).toBe(true);
        expect(showsStockPhotoNote(photo, photo, { 'modern-hero': photo })).toBe(false);
    });
});
