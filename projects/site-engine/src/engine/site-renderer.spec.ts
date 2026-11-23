import { provideZonelessChangeDetection, reflectComponentType } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SectionType, SiteConfig } from '../model/site.model';
import { emptyContent, forbiddenCopy, patchClinic, patchContent, sampleConfig, sampleImage, withoutImages } from '../testing/site-sample';
import { findAlternative, SECTION_REGISTRY, sectionAlternatives } from './section-registry';
import { designFromConcept, SITE_CONCEPTS } from './site-concepts';
import { SiteRendererComponent } from './site-renderer.component';
import { composeSiteConfig, readStoredConfig } from './site-stored-config';

const SECTION_TYPES: readonly SectionType[] = ['nav', 'hero', 'about', 'services', 'team', 'features', 'gallery', 'guide', 'contact', 'footer'];
const SUB_PAGES = ['/hakkimizda', '/hizmetler', '/hizmetler/genel-muayene', '/hekimler', '/ekibimiz', '/saglik-rehberi', '/saglik-rehberi/ilk-ziyaret', '/galeri', '/iletisim', '/randevu', '/acil', '/sss', '/subelerimiz'];
const PACK_KEYS = SITE_CONCEPTS.map((concept) => concept.key);
const BOOKING = 'https://portal.example.com/randevu/kod';

describe('SiteRendererComponent', () => {
    let fixture: ComponentFixture<SiteRendererComponent> | null = null;

    beforeEach(() => {
        // Sağlayıcı yok: motor panel oturumu, yönlendirici ya da HTTP istemeden çizebilmeli (K3).
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    });

    afterEach(() => {
        fixture?.destroy();
        fixture = null;
    });

    async function render(config: SiteConfig, inputs: { path?: string; only?: SectionType; width?: number; maxSections?: number } = {}): Promise<HTMLElement> {
        fixture?.destroy();
        fixture = TestBed.createComponent(SiteRendererComponent);
        fixture.componentRef.setInput('config', config);

        if (inputs.path) fixture.componentRef.setInput('path', inputs.path);

        if (inputs.only) fixture.componentRef.setInput('only', inputs.only);

        if (inputs.maxSections !== undefined) fixture.componentRef.setInput('maxSections', inputs.maxSections);

        const host = fixture.nativeElement as HTMLElement;

        host.style.width = `${inputs.width ?? 1280}px`;
        await fixture.whenStable();

        return host;
    }

    /** Görsellerin yüklenemediğini bildirir: motor görselsiz düzene döner. Ekranda görsel kalmayana kadar sürer. */
    async function failImages(host: HTMLElement): Promise<void> {
        for (let images = [...host.querySelectorAll('img')]; images.length; images = [...host.querySelectorAll('img')]) {
            images.forEach((image) => image.dispatchEvent(new Event('error')));
            await fixture!.whenStable();
        }
    }

    function withSections(config: SiteConfig, key: string): SiteConfig {
        return { ...config, design: { ...config.design, sections: { ...config.design.sections, ...Object.fromEntries(SECTION_TYPES.map((type) => [type, key])) } } };
    }

    /**
     * Taşan metin: kutu değil metnin kendisi ölçülür (blok öğenin kutusu taşan metni kapsamaz). Yatay kaydırılan raylar tasarım gereği
     * taşar, üç noktayla kesilen ad da görünmez kalır; onların dışındakiler kapsayıcının içinde kalmalı.
     */
    function overflowing(host: HTMLElement): string[] {
        const right = host.getBoundingClientRect().right;
        const range = document.createRange();

        return [...host.querySelectorAll<HTMLElement>('h1, h2, h3, p, a, address, dt, dd')]
            .filter((element) => !element.closest('[tabindex="0"], .home') && element.getClientRects().length > 0)
            .filter((element) => {
                range.selectNodeContents(element);

                return range.getBoundingClientRect().right > right + 1;
            })
            .map((element) => `${element.tagName}.${element.className}: ${element.textContent?.trim().slice(0, 40)}`);
    }

    describe('paketler ve bölüm alternatifleri', () => {
        it('kayıt defterinde her türün her paketten alternatifi var', () => {
            expect(SECTION_REGISTRY.length).toBe(SECTION_TYPES.length * PACK_KEYS.length);

            for (const type of SECTION_TYPES) {
                expect(sectionAlternatives(type).map((alternative) => alternative.key)).toEqual(PACK_KEYS);
            }
        });

        for (const alternative of SECTION_REGISTRY) {
            it(`${alternative.key}/${alternative.type} çizilir`, async () => {
                const config = sampleConfig();
                const host = await render({ ...config, design: { ...config.design, sections: { ...config.design.sections, [alternative.type]: alternative.key } } }, { only: alternative.type });

                expect(host.querySelector(`site-${alternative.key}-${alternative.type}`)).not.toBeNull();
                expect(host.textContent?.trim().length).toBeGreaterThan(0);
            });
        }

        for (const concept of SITE_CONCEPTS) {
            it(`${concept.key}: ana sayfa bütün bölümleriyle, konseptin bölümleriyle çizilir`, async () => {
                const host = await render({ ...sampleConfig(), design: designFromConcept(concept) });

                for (const type of SECTION_TYPES) {
                    expect(host.querySelector(`site-${concept.sectionKey}-${type}`), type).not.toBeNull();
                }
            });

            it(`${concept.key}: alt sayfalar çizilir, "bulunamadı"ya düşmez`, async () => {
                for (const path of SUB_PAGES) {
                    const host = await render(sampleConfig(concept.key), { path });

                    expect(host.querySelector('.lost'), path).toBeNull();
                    expect(host.querySelector('main')?.textContent?.trim().length, path).toBeGreaterThan(0);
                }
            });
        }

        for (const concept of SITE_CONCEPTS) {
            it(`${concept.key}: çizilen sabit ve hazır metinler K14 sınırını aşmaz`, async () => {
                for (const path of ['/', ...SUB_PAGES]) {
                    const host = await render(sampleConfig(concept.key), { path });

                    expect(forbiddenCopy(host.textContent ?? ''), path).toEqual([]);
                }
            });
        }

        for (const concept of SITE_CONCEPTS) {
            it(`${concept.key}: iletişim sayfasında alt bilgi telefonu tekrar yazmaz (W-04)`, async () => {
                const footer = `site-${concept.sectionKey}-footer`;

                expect((await render(sampleConfig(concept.key))).querySelector(`${footer} a[href^="tel:"]`)).not.toBeNull();
                expect((await render(sampleConfig(concept.key), { path: '/iletisim' })).querySelector(`${footer} a[href^="tel:"]`)).toBeNull();
            });
        }

        it('kayıtta olmayan alternatif anahtarı sayfayı bozmaz: türün ilk alternatifi çizilir', async () => {
            expect(findAlternative('hero', 'kaldirilmis-paket').key).toBe(PACK_KEYS[0]);

            const host = await render(withSections(sampleConfig(), 'kaldirilmis-paket'));

            expect(host.querySelector(`site-${PACK_KEYS[0]}-hero`)).not.toBeNull();
        });
    });

    describe('farklı paket bölümlerinin karışımı (K4)', () => {
        /** Her bölüm türü paketler arasında dönerek farklı paketten gelir; kaydırma karışımın hepsini dener. */
        const mixes = PACK_KEYS.map((_, shift) => Object.fromEntries(SECTION_TYPES.map((type, index) => [type, PACK_KEYS[(index + shift) % PACK_KEYS.length]])) as Record<SectionType, string>);

        for (const [shift, sections] of mixes.entries()) {
            for (const width of [375, 1280]) {
                it(`karışım ${shift + 1}, ${width}px: her bölüm kendi paketinden gelir, metin taşmaz`, async () => {
                    const config = sampleConfig();
                    const host = await render({ ...config, design: { ...config.design, sections } }, { width });

                    for (const type of SECTION_TYPES) {
                        expect(host.querySelector(`site-${sections[type]}-${type}`), type).not.toBeNull();
                    }

                    expect(overflowing(host)).toEqual([]);
                });
            }
        }
    });

    /** Görünen öğelerin metni: gizli (display: none, visibility: hidden ya da kutusuz) öğe sayılmaz. */
    function visible(host: HTMLElement, selector: string): string[] {
        return [...host.querySelectorAll<HTMLElement>(selector)]
            .filter((element) => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0)
            .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    }

    describe('K-01 düzeltmeleri, her konseptin kendi düzeninde', () => {
        for (const key of PACK_KEYS) {
            it(`${key}: logo yoksa yalnız yazı işareti çizilir (ad büyük, tür eki küçük), harfli kare yoktur; logo varsa yanında durur`, async () => {
                const plain = (await render(sampleConfig(key))).querySelector(`site-${key}-nav site-logo`)!;

                expect(plain.querySelector('img')).toBeNull();
                expect(plain.querySelector('.name')?.textContent?.trim()).toBe('Örnek');
                expect(plain.querySelector('.sub')?.textContent?.trim()).toBe('Veteriner Kliniği');
                expect(plain.textContent?.trim().startsWith('Ö')).toBe(true);
                expect(plain.querySelector('.mark')).toBeNull();

                const logo = (await render(patchClinic(sampleConfig(key), { logo: 'https://example.com/logo.png' }))).querySelector(`site-${key}-nav site-logo`)!;

                expect(logo.querySelector('img.logo')?.getAttribute('src')).toBe('https://example.com/logo.png');
                expect(logo.querySelector('.name')?.textContent?.trim()).toBe('Örnek');
            });

            it(`${key}: masaüstünde üst çubukta en çok beş ana bağlantı, kalanı "Diğer"de; telefonda hepsi "Menü"de`, async () => {
                const nav = `site-${key}-nav`;
                const wide = await render(sampleConfig(key), { width: 1280 });

                expect(visible(wide, `${nav} .links a`)).toEqual(['Hizmetler', 'Hakkımızda', 'Hekimler', 'Galeri', 'İletişim']);
                expect(visible(wide, `${nav} .burger span`)).toEqual(['Diğer']);

                wide.querySelector<HTMLButtonElement>(`${nav} .burger`)!.click();
                await fixture!.whenStable();

                // Modern listesi numaralıdır ("06 Sağlık Rehberi"); sıra numarası ayrı öğededir.
                expect(visible(wide, `${nav} .panel a.h`).map((text) => text.replace(/^\d+\s*/, ''))).toEqual(['Sağlık Rehberi', 'SSS', 'Acil', 'Ekibimiz', 'Şubeler']);

                const narrow = await render(sampleConfig(key), { width: 375 });

                expect(visible(narrow, `${nav} .links a`)).toEqual([]);
                expect(visible(narrow, `${nav} .burger span`)).toEqual(['Menü']);

                narrow.querySelector<HTMLButtonElement>(`${nav} .burger`)!.click();
                await fixture!.whenStable();

                expect(visible(narrow, `${nav} .panel a.h`)).toHaveLength(10);
            });

            it(`${key}: ana bağlantılar hepsiyse ve sığıyorsa "Diğer" düğmesi yoktur`, async () => {
                const config = sampleConfig(key);
                const host = await render({ ...config, structure: { ...config.structure, pages: { ...config.structure.pages, rehber: false, sss: false, acil: false, ekibimiz: false, subeler: false } } });

                expect(visible(host, `site-${key}-nav .burger`)).toEqual([]);
                expect(visible(host, `site-${key}-nav .links a`)).toHaveLength(5);
            });

            it(`${key}: düğmeler konseptin dilinde dolgun ana ve çerçeveli ikinci düğmedir; altı çizili metin bağlantı yoktur`, async () => {
                for (const path of ['/', ...SUB_PAGES]) {
                    expect((await render(patchClinic(sampleConfig(key), { bookingUrl: BOOKING }), { path })).querySelector('.tlink'), path).toBeNull();
                }

                const host = await render(patchClinic(sampleConfig(key), { bookingUrl: BOOKING }));
                const acts = [...host.querySelectorAll<HTMLAnchorElement>(`site-${key}-hero .acts a`)];

                expect(acts[0].getAttribute('href')).toBe(BOOKING);
                expect(acts[0].className).toMatch(/btn (main|acc)/);
                expect(acts[1].classList).toContain('btn');
                expect(acts[1].classList).toContain('line');
            });

            it(`${key}: telefonda giriş düğmeleri ekrandayken alt şerit gizli, alt sayfada görünür; randevu kapalıysa yalnız "Ara · numara"; geniş ekranda yok`, async () => {
                const home = await render(patchClinic(sampleConfig(key), { bookingUrl: BOOKING }), { width: 375 });

                expect(home.querySelector('site-dock .dock')?.classList).not.toContain('is-on');

                const page = await render(patchClinic(sampleConfig(key), { bookingUrl: BOOKING }), { path: '/hizmetler', width: 375 });

                expect(page.querySelector('site-dock .dock')?.classList).toContain('is-on');
                expect([...page.querySelectorAll('site-dock a')].map((link) => link.getAttribute('href'))).toEqual(['tel:00000000000', BOOKING]);

                const off = await render(sampleConfig(key), { path: '/hizmetler', width: 375 });
                const links = [...off.querySelectorAll('site-dock a')];

                expect(links).toHaveLength(1);
                expect(links[0].textContent?.replace(/\s+/g, ' ')).toContain('Ara · 0000 000 00 00');

                const wide = await render(sampleConfig(key), { path: '/hizmetler', width: 1280 });

                expect(getComputedStyle(wide.querySelector('site-dock')!).display).toBe('none');
            });

            it(`${key}: iletişimde telefon normal ölçüde ve tıklanır, çizim harita yerine "Haritada aç" vardır; saatlerde bugün işaretli`, async () => {
                const contact = (await render(sampleConfig(key))).querySelector(`site-${key}-contact`)!;
                const phone = contact.querySelector<HTMLElement>('a[href^="tel:"]')!;
                const size = parseFloat(getComputedStyle(phone).fontSize);

                expect(size).toBeGreaterThanOrEqual(13);
                expect(size).toBeLessThanOrEqual(20);
                expect(phone.textContent).toContain('0000 000 00 00');
                expect(contact.querySelector('site-map a')?.textContent).toContain('Haritada aç');
                expect(contact.querySelector('site-map a')?.getAttribute('target')).toBe('_blank');
                expect(contact.querySelectorAll('site-map path').length).toBeLessThanOrEqual(2);
                expect(contact.querySelector('site-hours em')?.textContent?.trim()).toBe('Bugün');
            });

            it(`${key}: saat girilmemişse durum ve saat tablosu çizilmez`, async () => {
                const host = await render(patchClinic(sampleConfig(key), { workingDays: [] }));

                expect(host.querySelector('site-status')).toBeNull();
                expect(host.querySelector('site-hours')).toBeNull();
            });

            it(`${key}: giriş bölümü olmayan bir yere bağlanmaz: hizmet yokken hizmet çapası yoktur, ikinci bağlantı iletişime gider (W-02)`, async () => {
                const host = await render(patchContent(sampleConfig(key), { services: [] }));
                const links = [...host.querySelectorAll(`site-${key}-hero a[href]`)].map((link) => link.getAttribute('href'));

                expect(links.filter((href) => href?.includes('#services'))).toEqual([]);
                expect(links).toContain('#contact');
            });
        }

        it('düğme köşesi konseptin dilindedir: Modern net, Zarif büyük harfli etiket, Samimi hap, Doğal yumuşak', async () => {
            const main = async (key: string): Promise<CSSStyleDeclaration> => getComputedStyle((await render(sampleConfig(key))).querySelector<HTMLElement>(`site-${key}-hero .acts .btn`)!);

            expect((await main('modern')).borderTopLeftRadius).toBe('8px');
            expect((await main('premium')).textTransform).toBe('uppercase');
            expect(parseFloat((await main('friendly')).borderTopLeftRadius)).toBeGreaterThanOrEqual(24);
            expect((await main('nature')).borderTopLeftRadius).toBe('16px');
        });
    });

    describe('geriye uyum: kayıtlı tasarım verisi', () => {
        /** K-01 öncesi kayıt: konsept, karışık bölüm seçimi, köşe ve logo yeri eskisi gibi saklanmış. */
        const beforeK01 = {
            conceptKey: 'premium',
            colors: { primary: '#c7a66b', secondary: '#7d6f5c', accent: '#c7a66b' },
            ground: 'gece',
            headFont: 'cormorant',
            bodyFont: 'jost',
            radius: 'keskin',
            logoPlacement: 'orta',
            character: 'zarif',
            sections: { nav: 'premium', hero: 'friendly', about: 'modern', services: 'premium', team: 'modern', features: 'nature', gallery: 'premium', guide: 'friendly', contact: 'nature', footer: 'premium' }
        };
        /** K-01 sonrası kayıt: bölüm seçimi konsept anahtarıyla dolu, köşe ve logo yeri K-01 varsayılanı. */
        const afterK01 = {
            ...beforeK01,
            conceptKey: 'modern',
            colors: { primary: '#0f4c81', secondary: '#5b7083', accent: '#d4451b' },
            ground: 'beyaz',
            headFont: 'instrument',
            bodyFont: 'instrument',
            radius: 'yumusak',
            logoPlacement: 'sol',
            character: 'sade',
            sections: Object.fromEntries(SECTION_TYPES.map((type) => [type, 'modern']))
        };

        /** Sunucudaki JSON'dan yayındaki gibi: saklanan yapılandırma okunur, klinik kaydıyla birleşir. */
        function stored(design: object): SiteConfig {
            const base = sampleConfig();
            const { logo: _logo, slogan: _slogan, intro: _intro, whatsapp: _whatsapp, website: _website, mapUrl: _mapUrl, instagram: _instagram, facebook: _facebook, ...record } = base.content.clinic;

            return composeSiteConfig(readStoredConfig({ schemaVersion: 1, content: base.content, design, structure: base.structure, seo: base.seo, publish: base.publish }), record, 'ornek');
        }

        it('K-01 öncesi kayıt eskisi gibi okunur: her bölüm seçili paketinden çizilir, logo ortada, köşe keskin', async () => {
            const host = await render(stored(beforeK01));

            for (const [type, key] of Object.entries(beforeK01.sections)) {
                expect(host.querySelector(`site-${key}-${type}`), type).not.toBeNull();
            }

            expect(host.querySelector('site-premium-nav .nav')?.classList).not.toContain('is-left');
            expect(host.querySelector('.site')?.getAttribute('style')).toContain('--s-radius: 2px');
            expect(overflowing(host)).toEqual([]);
        });

        it('K-01 sonrasında kaydedilmiş site bozulmaz: konseptin paketi ve kaydedilen köşe ile logo yeri çizilir', async () => {
            const host = await render(stored(afterK01));

            for (const type of SECTION_TYPES) {
                expect(host.querySelector(`site-modern-${type}`), type).not.toBeNull();
            }

            expect(host.querySelector('.site')?.getAttribute('style')).toContain('--s-radius: 10px');
            expect(host.querySelector('site-modern-nav .nav')?.classList).not.toContain('is-center');
            expect(overflowing(host)).toEqual([]);
        });

        it('bölüm seçimi eksik ya da bozuk kayıt sayfayı bozmaz: eksik tür konseptin paketinden, bilinmeyen anahtar ilk paketten çizilir', async () => {
            const host = await render(stored({ conceptKey: 'nature', sections: { hero: 'kaldirilmis-paket' } }));

            expect(host.querySelector(`site-${PACK_KEYS[0]}-hero`)).not.toBeNull();
            expect(host.querySelector('site-nature-nav')).not.toBeNull();
            expect(host.querySelector('site-nature-footer')).not.toBeNull();
        });
    });

    describe('görselsiz çizim', () => {
        for (const key of PACK_KEYS) {
            for (const width of [375, 1280]) {
                it(`${key}, ${width}px: fotoğraf yüklenemezse görselsiz düzen çizilir, metin taşmaz`, async () => {
                    const host = await render(withSections(withoutImages(sampleConfig()), key), { width });

                    await failImages(host);

                    expect(host.querySelectorAll('img').length).toBe(0);
                    expect(host.querySelector('h1')?.textContent?.trim().length).toBeGreaterThan(0);
                    expect(overflowing(host)).toEqual([]);
                });
            }

            it(`${key}: hekim kartında fotoğraf yoksa monogram çizilir`, async () => {
                const host = await render(withSections(withoutImages(sampleConfig()), key), { only: 'team' });

                expect(host.querySelectorAll('img').length).toBe(0);
                expect(host.textContent).toContain('ÖH');
                expect(host.textContent).toContain('DK');
            });

            it(`${key}: yazıdaki hizmet ve rehber sayfaları görselsiz çizilir`, async () => {
                for (const path of ['/hizmetler/genel-muayene', '/saglik-rehberi/ilk-ziyaret', '/saglik-rehberi', '/hizmetler']) {
                    const host = await render(withSections(withoutImages(sampleConfig()), key), { path });

                    await failImages(host);

                    expect(host.querySelector('.lost'), path).toBeNull();
                    expect(host.querySelectorAll('img').length, path).toBe(0);
                }
            });

            it(`${key}: yüklenen görsel çizilir, alt metni taşır`, async () => {
                const host = await render(withSections(sampleConfig(), key), { only: 'hero' });
                const image = host.querySelector('img');

                expect(image?.getAttribute('src')).toContain('data:image/png');
                expect(image?.getAttribute('alt')).toBe('Muayene masasında köpek');
            });
        }

        it('galeri kareleri de yüklenemezse sayfa düşer', async () => {
            const host = await render(withoutImages(sampleConfig()), { path: '/galeri' });

            await failImages(host);

            expect(host.querySelector('.lost')).not.toBeNull();
        });
    });

    describe('hazır fotoğraf (K7)', () => {
        const srcs = (host: HTMLElement): string[] => [...host.querySelectorAll('img')].map((image) => image.getAttribute('src') ?? '');

        for (const key of PACK_KEYS) {
            it(`${key}: klinik yüklemediği her bölümde hazır fotoğraf çizilir, adres bizim sunucudadır`, async () => {
                const config = withSections(withoutImages(sampleConfig()), key);

                for (const only of ['hero', 'about', 'features', 'gallery', 'guide'] as const) {
                    const list = srcs(await render(config, { only }));

                    expect(list.length, only).toBeGreaterThan(0);
                    expect(list.every((src) => src.startsWith('_stock/') && src.endsWith('.webp')), only).toBe(true);
                }

                // Premium hizmet listesi tasarımı gereği fotoğrafsızdır; detay sayfası her pakette fotoğraflıdır.
                expect(srcs(await render(config, { path: '/hizmetler/genel-muayene' }))[0]).toContain('_stock/ex-table');
            });

            it(`${key}: yüklenen görsel hazır fotoğrafın yerine geçer, kaldırınca hazır fotoğraf döner`, async () => {
                const empty = withSections(withoutImages(sampleConfig()), key);
                const uploaded = patchContent(empty, { heroImage: sampleImage('Kliniğin kendi fotoğrafı') });
                const host = await render(uploaded, { only: 'hero' });

                expect(host.querySelector('img')?.getAttribute('alt')).toBe('Kliniğin kendi fotoğrafı');
                fixture!.componentRef.setInput('config', empty);
                await fixture!.whenStable();
                expect(host.querySelector('img')?.getAttribute('src')).toContain('_stock/');
            });

            it(`${key}: hekim kartına hazır fotoğraf konmaz, monogram kalır`, async () => {
                const host = await render(withSections(withoutImages(sampleConfig()), key), { only: 'team' });

                expect(host.querySelectorAll('img').length).toBe(0);
                expect(host.textContent).toContain('ÖH');
            });

            it(`${key}: "temsili" ibaresi hazır fotoğraf çizilen sitede bir kez görünür`, async () => {
                const host = await render(withSections(withoutImages(sampleConfig()), key));

                expect(host.querySelectorAll('.stock-note').length).toBe(1);
                expect(host.querySelector('.stock-note')?.textContent).toContain('temsilidir');
            });
        }

        it('hazır fotoğraf dosyası gerçekten yüklenir, en uzun kenarı 2000 pikseli aşmaz', async () => {
            const host = await render(withoutImages(sampleConfig()), { only: 'hero' });
            const image = host.querySelector('img')!;

            await image.decode();

            expect(image.naturalWidth).toBeGreaterThan(0);
            expect(Math.max(image.naturalWidth, image.naturalHeight)).toBeLessThanOrEqual(2000);
        });

        it('galeri yüklemesi yoksa hazır kareler sayfada da görünür', async () => {
            const host = await render(withoutImages(sampleConfig()), { path: '/galeri' });

            expect(host.querySelector('.lost')).toBeNull();
            expect(srcs(host).length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('boş içerik', () => {
        for (const key of PACK_KEYS) {
            for (const width of [375, 1280]) {
                it(`${key}, ${width}px: hiçbir alan dolu değilken iskelet çizilir, boş bölüm görünmez`, async () => {
                    const host = await render(withSections(emptyContent(sampleConfig()), key), { width });

                    expect(host.querySelector(`site-${key}-nav`)).not.toBeNull();
                    expect(host.querySelector(`site-${key}-hero`)).not.toBeNull();
                    expect(host.querySelector(`site-${key}-footer`)).not.toBeNull();

                    for (const type of ['services', 'team', 'features', 'guide', 'contact'] as const) {
                        expect(host.querySelector(`site-${key}-${type}`), type).toBeNull();
                    }

                    expect(host.querySelector(`site-${key}-gallery`)).not.toBeNull();
                    expect(overflowing(host)).toEqual([]);
                });
            }
        }

        it('içeriği boş sayfa menüye girmez ve adresi "bulunamadı" olur', async () => {
            const host = await render(emptyContent(sampleConfig()));
            const menu = [...host.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

            expect(menu).toContain('/hakkimizda');

            expect(menu).toContain('/galeri');

            for (const path of ['/hizmetler', '/hekimler', '/saglik-rehberi', '/sss', '/acil', '/ekibimiz', '/subelerimiz', '/iletisim']) {
                expect(menu, path).not.toContain(path);
                expect((await render(emptyContent(sampleConfig()), { path })).querySelector('.lost'), path).not.toBeNull();
            }
        });

        it('kapatılan bölüm ana sayfada görünmez', async () => {
            const config = sampleConfig();
            const homeSections = config.structure.homeSections.map((section) => (section.type === 'team' ? { ...section, on: false } : section));
            const host = await render({ ...config, structure: { ...config.structure, homeSections } });

            expect(host.querySelector('site-modern-team')).toBeNull();
            expect(host.querySelector('site-modern-services')).not.toBeNull();
        });

        it('bölüm sırası yapılandırmadan gelir', async () => {
            const config = sampleConfig();
            const host = await render({ ...config, structure: { ...config.structure, homeSections: [...config.structure.homeSections].reverse() } });
            const order = [...host.querySelectorAll('.slot')].map((slot) => slot.getAttribute('data-anchor'));

            expect(order[0]).toBe('contact');
            expect(order.at(-1)).toBe('about');
        });

        it('olmayan yol, kapalı sayfa ve nesne prototipi adı "bulunamadı" olur', async () => {
            const config = sampleConfig();

            for (const path of ['/yok', '/hizmetler/yok', '/hakkimizda/alt', '/constructor', '/__proto__']) {
                expect((await render(config, { path })).querySelector('.lost'), path).not.toBeNull();
            }

            const closed = { ...config, structure: { ...config.structure, pages: { ...config.structure.pages, sss: false } } };

            expect((await render(closed, { path: '/sss' })).querySelector('.lost')).not.toBeNull();
        });

        it('online randevu kapalıysa eylem düğmesi telefona döner, telefon da yoksa çizilmez (K11)', async () => {
            const config = sampleConfig();
            const noBooking = { ...config, structure: { ...config.structure, pages: { ...config.structure.pages, randevu: false } } };
            const withPhone = await render(noBooking);

            expect(withPhone.querySelector('site-modern-nav a.cta')?.getAttribute('href')).toBe('tel:00000000000');

            const noPhone = await render(patchClinic(noBooking, { phone: '' }));

            expect(noPhone.querySelector('site-modern-nav a.cta')).toBeNull();
        });

        it('randevu sayfası en yakın saatleri talep formuna bağlar; online randevu kapalıysa çizmez (TIER-017)', async () => {
            const slots = [
                { date: '2026-11-09', startUtc: '2026-11-09T06:00:00Z' },
                { date: '2026-11-09', startUtc: '2026-11-09T06:30:00Z' },
                { date: '2026-11-10', startUtc: '2026-11-10T11:00:00Z' }
            ];
            const host = await render(patchClinic(sampleConfig(), { bookingUrl: 'https://portal.example.com/randevu/kod', nextSlots: slots }), { path: '/randevu' });
            const links = [...host.querySelectorAll<HTMLAnchorElement>('.slots a.slot')];

            expect(links.map((link) => link.textContent?.trim())).toEqual(['09:00', '09:30', '14:00']);
            expect(links[0].getAttribute('href')).toBe('https://portal.example.com/randevu/kod?saat=2026-11-09T06%3A00%3A00Z');
            expect(host.querySelectorAll('.slot-day h3')).toHaveLength(2);
            expect(host.querySelector('.slots')?.textContent).toContain('klinik onaylayınca');

            const off = await render(patchClinic(sampleConfig(), { bookingUrl: null, nextSlots: slots }), { path: '/randevu' });

            expect(off.querySelector('.slots')).toBeNull();
        });
    });

    describe('güvenlik', () => {
        const UNSAFE = 'javascript:alert(1)';

        it('güvensiz bağlantı ve görsel adresi çizilmez', async () => {
            const config = patchClinic(sampleConfig(), { mapUrl: UNSAFE, website: UNSAFE, instagram: UNSAFE, facebook: 'data:text/html,<script>alert(1)</script>', logo: UNSAFE });
            const dirty = patchContent(config, { heroImage: { src: UNSAFE, alt: 'x' }, gallery: [{ src: UNSAFE, alt: 'x' }] });

            for (const key of PACK_KEYS) {
                const host = await render(withSections(dirty, key));
                const urls = [...host.querySelectorAll('a[href], img[src]')].map((element) => element.getAttribute('href') ?? element.getAttribute('src') ?? '');

                for (const url of urls) {
                    expect(url, key).not.toMatch(/^(javascript|data:text|unsafe)/i);
                }

                expect(host.querySelector(`site-${key}-gallery img`)?.getAttribute('src'), key).toContain('_stock/');
            }
        });

        it('harita adresi güvenliyse kullanılır, güvensizse kliniğin adresinden üretilir', async () => {
            const safe = await render(patchClinic(sampleConfig(), { mapUrl: 'https://harita.example.com/klinik' }), { only: 'contact' });

            expect(safe.querySelector('site-map a')?.getAttribute('href')).toBe('https://harita.example.com/klinik');

            const unsafe = await render(patchClinic(sampleConfig(), { mapUrl: UNSAFE }), { only: 'contact' });

            expect(unsafe.querySelector('site-map a')?.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
        });

        it('metinler düz metin çizilir, HTML olarak yorumlanmaz', async () => {
            const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
            const config = patchContent(patchClinic(sampleConfig(), { name: payload, slogan: payload, intro: payload }), {
                copy: { ...sampleConfig().content.copy, heroTitle: payload, aboutText: payload },
                services: [{ slug: 'x', title: payload, summary: payload, body: payload, image: null }],
                faqs: [{ question: payload, answer: payload }]
            });
            const clean = patchContent(config, { heroImage: null, aboutImage: null, gallery: [], members: [], articles: [] });

            for (const key of PACK_KEYS) {
                const host = await render(withSections(clean, key));

                expect(host.querySelector('img[src="x"]'), key).toBeNull();
                expect(host.querySelector('script'), key).toBeNull();
                expect(host.textContent, key).toContain('<img src=x');
                expect((window as unknown as { __xss?: number }).__xss, key).toBeUndefined();
            }
        });

        it('renk CSS değişkenine yalnız #rrggbb olarak geçer', async () => {
            const config = sampleConfig();
            const host = await render({ ...config, design: { ...config.design, colors: { primary: 'url(https://example.com/iz)', secondary: '#123456', accent: 'red;background:url(x)' } } });

            expect(host.querySelector('.site')?.getAttribute('style')).not.toContain('url(');
        });

        it('üçüncü taraf font, harita ve görsel adresine istek gitmez', async () => {
            const host = await render(sampleConfig());

            expect(document.head.querySelector('link[href*="fonts.g"]')).toBeNull();
            expect(host.querySelector('iframe')).toBeNull();
            expect(host.innerHTML).not.toContain('unsplash');
            expect(host.innerHTML).not.toContain('googleapis');
        });
    });

    describe('motorun sihirbazdan bağımsızlığı (K3)', () => {
        it('dış yüzü yalnız yapılandırma ve çizim seçenekleridir', () => {
            const mirror = reflectComponentType(SiteRendererComponent)!;

            expect(mirror.inputs.map((input) => input.templateName).sort()).toEqual(['baseHref', 'config', 'maxSections', 'only', 'path', 'viewportHeight']);
            expect(mirror.outputs.map((output) => output.templateName)).toEqual(['pathChange']);
        });

        it('iç bağlantı yalnız yolu değiştirir, sayfa aynı bileşende çizilir', async () => {
            const host = await render(sampleConfig());
            const link = host.querySelector<HTMLAnchorElement>('site-modern-nav nav a[href="/hizmetler"]')!;

            link.click();
            await fixture!.whenStable();

            expect(fixture!.componentInstance.path()).toBe('/hizmetler');
            expect(host.querySelector('.page-head')).not.toBeNull();
        });

        it('baseHref bağlantılara önek olur: panel önizlemesi ve yayın aynı bileşeni çizer', async () => {
            fixture = TestBed.createComponent(SiteRendererComponent);
            fixture.componentRef.setInput('config', sampleConfig());
            fixture.componentRef.setInput('baseHref', '/k/ornek');
            await fixture.whenStable();

            expect((fixture.nativeElement as HTMLElement).querySelector('site-modern-nav nav a')?.getAttribute('href')).toBe('/k/ornek/hizmetler');
        });

        it('küçük resim seçenekleri: yalnız bir bölüm ya da sınırlı sayıda bölüm', async () => {
            const only = await render(sampleConfig(), { only: 'hero' });

            expect(only.querySelector('main')).toBeNull();
            expect(only.querySelector('site-modern-hero')).not.toBeNull();

            fixture!.destroy();
            fixture = TestBed.createComponent(SiteRendererComponent);
            fixture.componentRef.setInput('config', sampleConfig());
            fixture.componentRef.setInput('maxSections', 2);
            await fixture.whenStable();

            expect((fixture.nativeElement as HTMLElement).querySelectorAll('.slot').length).toBe(2);
            expect((fixture.nativeElement as HTMLElement).querySelector('site-dock')).toBeNull();
        });

        it('galerideki yüklenen görsel hâlâ çizilir', async () => {
            const host = await render(patchContent(sampleConfig(), { gallery: [sampleImage('Tek kare')] }), { only: 'gallery' });

            expect(host.querySelectorAll('img').length).toBe(1);
        });
    });
});
