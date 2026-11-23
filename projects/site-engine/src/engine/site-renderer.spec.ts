import { provideZonelessChangeDetection, reflectComponentType } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SectionType, SiteConfig } from '../model/site.model';
import { emptyContent, forbiddenCopy, patchClinic, patchContent, sampleConfig, sampleImage, withoutImages } from '../testing/site-sample';
import { SECTION_COMPONENTS } from './section-registry';
import { designFromConcept, SITE_CONCEPTS } from './site-concepts';
import { serviceIcon, SITE_ICONS } from './site-icons';
import { SiteRendererComponent } from './site-renderer.component';

const SECTION_TYPES: readonly SectionType[] = ['nav', 'hero', 'about', 'services', 'team', 'features', 'gallery', 'guide', 'contact', 'footer'];
const SUB_PAGES = ['/hakkimizda', '/hizmetler', '/hizmetler/genel-muayene', '/hekimler', '/ekibimiz', '/saglik-rehberi', '/saglik-rehberi/ilk-ziyaret', '/galeri', '/iletisim', '/randevu', '/acil', '/sss', '/subelerimiz'];
const CONCEPT_KEYS = SITE_CONCEPTS.map((concept) => concept.key);
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

    async function render(config: SiteConfig, inputs: { path?: string; width?: number; maxSections?: number } = {}): Promise<HTMLElement> {
        fixture?.destroy();
        fixture = TestBed.createComponent(SiteRendererComponent);
        fixture.componentRef.setInput('config', config);

        if (inputs.path) fixture.componentRef.setInput('path', inputs.path);

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

    function concept(config: SiteConfig, key: string): SiteConfig {
        return { ...config, design: designFromConcept(SITE_CONCEPTS.find((item) => item.key === key)!) };
    }

    function withSections(config: SiteConfig, key: string): SiteConfig {
        return { ...config, design: { ...config.design, sections: Object.fromEntries(SECTION_TYPES.map((type) => [type, key])) as Record<SectionType, string> } };
    }

    /** Sayfanın iskeleti: öğe adları ve sınıfları. Konseptler yalnız token ile ayrıldığı için iskelet hepsinde aynıdır. */
    function skeleton(host: HTMLElement): string {
        return [...host.querySelectorAll('.site *')].map((element) => `${element.tagName}.${element.getAttribute('class') ?? ''}`).join('|');
    }

    /**
     * Taşan metin: kutu değil metnin kendisi ölçülür (blok öğenin kutusu taşan metni kapsamaz). Üst çubuktaki ad kendi kuralıyla
     * kısalır; onun dışındakiler kapsayıcının içinde kalmalı.
     */
    function overflowing(host: HTMLElement): string[] {
        const right = host.getBoundingClientRect().right;
        const range = document.createRange();

        return [...host.querySelectorAll<HTMLElement>('h1, h2, h3, p, a, address, dt, dd')]
            .filter((element) => !element.closest('.home') && element.getClientRects().length > 0)
            .filter((element) => {
                range.selectNodeContents(element);

                return range.getBoundingClientRect().right > right + 1;
            })
            .map((element) => `${element.tagName}.${element.className}: ${element.textContent?.trim().slice(0, 40)}`);
    }

    const srcs = (host: Element | null): string[] => [...(host?.querySelectorAll('img') ?? [])].map((image) => image.getAttribute('src') ?? '');

    describe('tek düzen, dört konsept (K-01)', () => {
        it('her bölüm türünün tek bileşeni vardır', () => {
            expect(Object.keys(SECTION_COMPONENTS).sort()).toEqual([...SECTION_TYPES].sort());
        });

        it('konseptler aynı iskeleti çizer, yalnız token ile ayrılır', async () => {
            const skeletons: string[] = [];
            const styles: string[] = [];

            for (const key of CONCEPT_KEYS) {
                const host = await render(concept(sampleConfig(), key));

                skeletons.push(skeleton(host));
                styles.push(host.querySelector('.site')?.getAttribute('style') ?? '');
            }

            expect(new Set(skeletons).size).toBe(1);
            expect(new Set(styles).size).toBe(CONCEPT_KEYS.length);
        });

        it('eski kayıttaki bölüm seçimi (karışım ya da kaldırılmış paket) düzeni değiştirmez', async () => {
            const base = skeleton(await render(sampleConfig()));

            for (const key of ['premium', 'friendly', 'kaldirilmis-paket']) {
                expect(skeleton(await render(withSections(sampleConfig(), key))), key).toBe(base);
            }
        });

        for (const key of CONCEPT_KEYS) {
            it(`${key}: ana sayfa bütün bölümleriyle çizilir`, async () => {
                const host = await render(concept(sampleConfig(), key));

                for (const type of SECTION_TYPES) {
                    expect(host.querySelector(`site-${type}`), type).not.toBeNull();
                }
            });

            for (const width of [375, 1280]) {
                it(`${key}, ${width}px: ana sayfada ve alt sayfalarda metin taşmaz`, async () => {
                    for (const path of ['/', ...SUB_PAGES]) {
                        const host = await render(concept(patchClinic(sampleConfig(), { bookingUrl: BOOKING }), key), { path, width });

                        expect(overflowing(host), path).toEqual([]);
                    }
                });
            }

            it(`${key}: alt sayfalar çizilir, "bulunamadı"ya düşmez`, async () => {
                for (const path of SUB_PAGES) {
                    const host = await render(concept(sampleConfig(), key), { path });

                    expect(host.querySelector('.lost'), path).toBeNull();
                    expect(host.querySelector('main')?.textContent?.trim().length, path).toBeGreaterThan(0);
                }
            });

            it(`${key}: çizilen sabit ve hazır metinler K14 sınırını aşmaz`, async () => {
                for (const path of ['/', ...SUB_PAGES]) {
                    const host = await render(concept(sampleConfig(), key), { path });

                    expect(forbiddenCopy(host.textContent ?? ''), path).toEqual([]);
                }
            });
        }
    });

    describe('üst çubuk, giriş bölümü ve alt şerit (K-01)', () => {
        it('logo yoksa yalnız yazı işareti çizilir: ad büyük, tür eki küçük; harfli kare yoktur', async () => {
            const host = await render(sampleConfig());
            const logo = host.querySelector('site-nav site-logo')!;

            expect(logo.querySelector('img')).toBeNull();
            expect(logo.querySelector('.name')?.textContent?.trim()).toBe('Örnek');
            expect(logo.querySelector('.sub')?.textContent?.trim()).toBe('Veteriner Kliniği');
        });

        it('logo varsa logo ve yanında yazı işareti çizilir', async () => {
            const host = await render(patchClinic(sampleConfig(), { logo: 'https://example.com/logo.png' }));
            const logo = host.querySelector('site-nav site-logo')!;

            expect(logo.querySelector('img.logo')?.getAttribute('src')).toBe('https://example.com/logo.png');
            expect(logo.querySelector('.name')?.textContent?.trim()).toBe('Örnek');
        });

        it('masaüstünde üst çubukta en çok beş ana bağlantı açık durur, kalanı "Diğer"dedir; telefonda hepsi "Menü"dedir', async () => {
            const visible = (host: HTMLElement, selector: string): string[] =>
                [...host.querySelectorAll<HTMLElement>(selector)].filter((element) => getComputedStyle(element).display !== 'none' && element.getClientRects().length > 0).map((element) => element.textContent?.trim() ?? '');
            const wide = await render(sampleConfig(), { width: 1280 });
            const burger = wide.querySelector<HTMLButtonElement>('site-nav .burger')!;

            expect(visible(wide, 'site-nav .links a')).toEqual(['Hizmetler', 'Hakkımızda', 'Hekimler', 'Galeri', 'İletişim']);
            expect(visible(wide, 'site-nav .burger span')).toEqual(['Diğer']);

            burger.click();
            await fixture!.whenStable();

            expect(visible(wide, 'site-nav .panel a')).toEqual(['Sağlık Rehberi', 'SSS', 'Acil', 'Ekibimiz', 'Şubeler']);

            const narrow = await render(sampleConfig(), { width: 375 });

            expect(visible(narrow, 'site-nav .links a')).toEqual([]);
            expect(visible(narrow, 'site-nav .burger span')).toEqual(['Menü']);

            narrow.querySelector<HTMLButtonElement>('site-nav .burger')!.click();
            await fixture!.whenStable();

            expect(visible(narrow, 'site-nav .panel a')).toHaveLength(10);
        });

        it('giriş bölümü: durum çipi, randevu ve "Ara · numara" düğmeleri, konum ve yol tarifi', async () => {
            const host = await render(patchClinic(sampleConfig(), { bookingUrl: BOOKING }));
            const hero = host.querySelector('site-hero')!;
            const actions = [...hero.querySelectorAll<HTMLAnchorElement>('.acts a')];

            expect(hero.querySelector('.chip site-status')).not.toBeNull();
            expect(actions.map((link) => link.getAttribute('href'))).toEqual([BOOKING, 'tel:00000000000']);
            expect(actions[0].classList).toContain('main');
            expect(actions[1].textContent).toContain('Ara · 0000 000 00 00');
            expect(hero.querySelector('a.loc')?.textContent).toContain('Yol tarifi');
            expect(hero.querySelector('a.loc')?.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\//);
        });

        it('online randevu kapalıysa eylemler numaralı telefondur, telefon da yoksa çizilmez (K11)', async () => {
            const host = await render(sampleConfig());

            expect(host.querySelector('site-nav a.act')?.getAttribute('href')).toBe('tel:00000000000');
            expect(host.querySelector('site-nav a.act')?.textContent).toContain('0000 000 00 00');
            expect([...host.querySelectorAll('site-hero .acts a')].map((link) => link.className)).toEqual(['btn main']);

            const booking = await render(patchClinic(sampleConfig(), { bookingUrl: BOOKING }));

            expect(booking.querySelector('site-nav a.act')?.getAttribute('href')).toBe(BOOKING);

            const none = await render(patchClinic(sampleConfig(), { phone: '' }));

            expect(none.querySelector('site-nav a.act')).toBeNull();
            expect(none.querySelector('site-hero .acts')).toBeNull();
            expect(none.querySelector('site-dock .dock')).toBeNull();
        });

        it('alt şerit: giriş düğmeleri ekrandayken gizli, alt sayfada görünür; randevu kapalıysa yalnız "Ara · numara"', async () => {
            const home = await render(patchClinic(sampleConfig(), { bookingUrl: BOOKING }), { width: 375 });

            expect(home.querySelector('site-dock .dock')?.classList).not.toContain('is-on');

            const page = await render(patchClinic(sampleConfig(), { bookingUrl: BOOKING }), { path: '/hizmetler', width: 375 });

            expect(page.querySelector('site-dock .dock')?.classList).toContain('is-on');
            expect([...page.querySelectorAll('site-dock a')].map((link) => link.getAttribute('href'))).toEqual(['tel:00000000000', BOOKING]);

            const off = await render(sampleConfig(), { path: '/hizmetler', width: 375 });
            const links = [...off.querySelectorAll('site-dock a')];

            expect(links).toHaveLength(1);
            expect(links[0].textContent?.replace(/\s+/g, ' ')).toContain('Ara · 0000 000 00 00');
        });

        it('alt şerit geniş ekranda çizilmez', async () => {
            const host = await render(sampleConfig(), { path: '/hizmetler', width: 1280 });

            expect(getComputedStyle(host.querySelector('site-dock')!).display).toBe('none');
        });

        it('hizmet kartının ikonu hizmet adından gelir', async () => {
            const host = await render(sampleConfig());
            const paths = [...host.querySelectorAll('site-services .bub path')].map((path) => path.getAttribute('d'));

            expect(paths).toEqual(sampleConfig().content.services.map((service) => SITE_ICONS[serviceIcon(service.title)]));
        });

        it('iletişimde telefon normal ölçüde, çizim harita yerine "Haritada aç" bağlantısı vardır', async () => {
            const host = await render(sampleConfig());
            const phone = host.querySelector<HTMLElement>('site-contact a[href^="tel:"]')!;

            expect(parseFloat(getComputedStyle(phone).fontSize)).toBeLessThanOrEqual(20);
            expect(host.querySelector('site-map a')?.textContent).toContain('Haritada aç');
            expect(host.querySelector('site-map a')?.getAttribute('target')).toBe('_blank');
            expect(host.querySelectorAll('site-map path').length).toBeLessThanOrEqual(2);
        });

        it('giriş bölümü olmayan bir yere bağlanmaz: hizmet yokken hizmet çapası yoktur, çip iletişime gider (W-02)', async () => {
            const host = await render(patchContent(sampleConfig(), { services: [] }));
            const links = [...host.querySelectorAll('site-hero a[href]')].map((link) => link.getAttribute('href'));

            expect(links.filter((href) => href?.includes('#services'))).toEqual([]);
            expect(host.querySelector('site-hero a.chip')?.getAttribute('href')).toBe('#contact');

            const noContact = patchClinic(sampleConfig(), { phone: '', email: '', address: '', district: '', city: '' });
            const bare = await render({ ...noContact, structure: { ...noContact.structure, pages: { ...noContact.structure.pages, iletisim: false } } });

            expect(bare.querySelector('site-hero a.chip')).toBeNull();
            expect(bare.querySelector('site-hero p.chip')).not.toBeNull();
        });

        it('iletişim sayfasında alt bilgi telefon, e-posta ve adresi tekrar yazmaz (W-04)', async () => {
            const home = await render(sampleConfig());

            expect(home.querySelector('site-footer a[href^="tel:"]')).not.toBeNull();

            const contact = await render(sampleConfig(), { path: '/iletisim' });

            expect(contact.querySelector('site-footer a[href^="tel:"]')).toBeNull();
            expect(contact.querySelector('site-footer a[href^="mailto:"]')).toBeNull();
            expect(contact.querySelector('site-footer address')).toBeNull();
            expect(contact.querySelector('site-contact a[href^="tel:"]')).not.toBeNull();
        });

        it('saat girilmemişse durum çipi ve saat kartı çizilmez', async () => {
            const host = await render(patchClinic(sampleConfig(), { workingDays: [] }));

            expect(host.querySelector('site-hero .chip')).toBeNull();
            expect(host.querySelector('site-contact site-hours')).toBeNull();
            expect(host.querySelector('site-nav site-status')).toBeNull();
        });
    });

    describe('görselsiz çizim', () => {
        for (const key of CONCEPT_KEYS) {
            for (const width of [375, 1280]) {
                it(`${key}, ${width}px: fotoğraf yüklenemezse görselsiz düzen çizilir, metin taşmaz`, async () => {
                    const host = await render(concept(withoutImages(sampleConfig()), key), { width });

                    await failImages(host);

                    expect(host.querySelectorAll('img').length).toBe(0);
                    expect(host.querySelector('h1')?.textContent?.trim().length).toBeGreaterThan(0);
                    expect(overflowing(host)).toEqual([]);
                });
            }
        }

        it('hekim kartında fotoğraf yoksa baş harfler çizilir', async () => {
            const host = await render(withoutImages(sampleConfig()));

            expect(srcs(host.querySelector('site-team'))).toEqual([]);
            expect(host.querySelector('site-team')?.textContent).toContain('ÖH');
            expect(host.querySelector('site-team')?.textContent).toContain('DK');
        });

        it('yazıdaki hizmet ve rehber sayfaları görselsiz çizilir', async () => {
            for (const path of ['/hizmetler/genel-muayene', '/saglik-rehberi/ilk-ziyaret', '/saglik-rehberi', '/hizmetler']) {
                const host = await render(withoutImages(sampleConfig()), { path });

                await failImages(host);

                expect(host.querySelector('.lost'), path).toBeNull();
                expect(host.querySelectorAll('img').length, path).toBe(0);
            }
        });

        it('yüklenen görsel çizilir, alt metni taşır', async () => {
            const image = (await render(sampleConfig())).querySelector('site-hero img');

            expect(image?.getAttribute('src')).toContain('data:image/png');
            expect(image?.getAttribute('alt')).toBe('Muayene masasında köpek');
        });

        it('galeri kareleri de yüklenemezse sayfa düşer', async () => {
            const host = await render(withoutImages(sampleConfig()), { path: '/galeri' });

            await failImages(host);

            expect(host.querySelector('.lost')).not.toBeNull();
        });
    });

    describe('hazır fotoğraf (K7)', () => {
        for (const key of CONCEPT_KEYS) {
            it(`${key}: klinik yüklemediği her bölümde konseptin hazır fotoğrafı çizilir, adres bizim sunucudadır`, async () => {
                const host = await render(concept(withoutImages(sampleConfig()), key));

                for (const type of ['hero', 'about', 'features', 'gallery', 'guide'] as const) {
                    const list = srcs(host.querySelector(`site-${type}`));

                    expect(list.length, type).toBeGreaterThan(0);
                    expect(list.every((src) => src.startsWith('_stock/') && src.endsWith('.webp')), type).toBe(true);
                }

                expect(srcs(await render(concept(withoutImages(sampleConfig()), key), { path: '/hizmetler/genel-muayene' }))[0]).toContain('_stock/ex-table');
            });

            it(`${key}: "temsili" ibaresi hazır fotoğraf çizilen sitede bir kez görünür`, async () => {
                const host = await render(concept(withoutImages(sampleConfig()), key));

                expect(host.querySelectorAll('.stock-note').length).toBe(1);
                expect(host.querySelector('.stock-note')?.textContent).toContain('temsilidir');
            });
        }

        it('yüklenen görsel hazır fotoğrafın yerine geçer, kaldırınca hazır fotoğraf döner', async () => {
            const empty = withoutImages(sampleConfig());
            const host = await render(patchContent(empty, { heroImage: sampleImage('Kliniğin kendi fotoğrafı') }));

            expect(host.querySelector('site-hero img')?.getAttribute('alt')).toBe('Kliniğin kendi fotoğrafı');
            fixture!.componentRef.setInput('config', empty);
            await fixture!.whenStable();
            expect(host.querySelector('site-hero img')?.getAttribute('src')).toContain('_stock/');
        });

        it('hekim kartına hazır fotoğraf konmaz', async () => {
            expect(srcs((await render(withoutImages(sampleConfig()))).querySelector('site-team'))).toEqual([]);
        });

        it('hazır fotoğraf dosyası gerçekten yüklenir, en uzun kenarı 2000 pikseli aşmaz', async () => {
            const image = (await render(withoutImages(sampleConfig()))).querySelector<HTMLImageElement>('site-hero img')!;

            await image.decode();

            expect(image.naturalWidth).toBeGreaterThan(0);
            expect(Math.max(image.naturalWidth, image.naturalHeight)).toBeLessThanOrEqual(2000);
        });

        it('galeri yüklemesi yoksa hazır kareler sayfada da görünür', async () => {
            const host = await render(withoutImages(sampleConfig()), { path: '/galeri' });

            expect(host.querySelector('.lost')).toBeNull();
            expect(srcs(host.querySelector('site-gallery')).length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('boş içerik', () => {
        for (const width of [375, 1280]) {
            it(`${width}px: hiçbir alan dolu değilken iskelet çizilir, boş bölüm görünmez`, async () => {
                const host = await render(emptyContent(sampleConfig()), { width });

                for (const type of ['nav', 'hero', 'footer', 'gallery'] as const) {
                    expect(host.querySelector(`site-${type}`), type).not.toBeNull();
                }

                for (const type of ['services', 'team', 'features', 'guide', 'contact'] as const) {
                    expect(host.querySelector(`site-${type}`), type).toBeNull();
                }

                expect(host.querySelector('site-dock .dock')).toBeNull();
                expect(overflowing(host)).toEqual([]);
            });
        }

        it('içeriği boş sayfa menüye girmez ve adresi "bulunamadı" olur', async () => {
            const host = await render(emptyContent(sampleConfig()));
            const menu = [...host.querySelectorAll('site-nav nav a')].map((link) => link.getAttribute('href'));

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

            expect(host.querySelector('site-team')).toBeNull();
            expect(host.querySelector('site-services')).not.toBeNull();
        });

        it('bölüm sırası yapılandırmadan gelir; bölümler sırayla yüzey ve zemin üstündedir', async () => {
            const config = sampleConfig();
            const host = await render({ ...config, structure: { ...config.structure, homeSections: [...config.structure.homeSections].reverse() } });
            const slots = [...host.querySelectorAll<HTMLElement>('.slot')];
            const backgrounds = slots.map((slot) => getComputedStyle(slot).backgroundColor);

            expect(slots[0].getAttribute('data-anchor')).toBe('contact');
            expect(slots.at(-1)?.getAttribute('data-anchor')).toBe('about');
            expect(backgrounds[0]).not.toBe(backgrounds[1]);
            expect(backgrounds[0]).toBe(backgrounds[2]);
        });

        it('olmayan yol, kapalı sayfa ve nesne prototipi adı "bulunamadı" olur', async () => {
            const config = sampleConfig();

            for (const path of ['/yok', '/hizmetler/yok', '/hakkimizda/alt', '/constructor', '/__proto__']) {
                expect((await render(config, { path })).querySelector('.lost'), path).not.toBeNull();
            }

            const closed = { ...config, structure: { ...config.structure, pages: { ...config.structure.pages, sss: false } } };

            expect((await render(closed, { path: '/sss' })).querySelector('.lost')).not.toBeNull();
        });

        it('randevu sayfası en yakın saatleri talep formuna bağlar; online randevu kapalıysa çizmez (TIER-017)', async () => {
            const slots = [
                { date: '2026-11-09', startUtc: '2026-11-09T06:00:00Z' },
                { date: '2026-11-09', startUtc: '2026-11-09T06:30:00Z' },
                { date: '2026-11-10', startUtc: '2026-11-10T11:00:00Z' }
            ];
            const host = await render(patchClinic(sampleConfig(), { bookingUrl: BOOKING, nextSlots: slots }), { path: '/randevu' });
            const links = [...host.querySelectorAll<HTMLAnchorElement>('.slots a.slot')];

            expect(links.map((link) => link.textContent?.trim())).toEqual(['09:00', '09:30', '14:00']);
            expect(links[0].getAttribute('href')).toBe(`${BOOKING}?saat=2026-11-09T06%3A00%3A00Z`);
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
            const host = await render(patchContent(config, { heroImage: { src: UNSAFE, alt: 'x' }, gallery: [{ src: UNSAFE, alt: 'x' }] }));
            const urls = [...host.querySelectorAll('a[href], img[src]')].map((element) => element.getAttribute('href') ?? element.getAttribute('src') ?? '');

            for (const url of urls) {
                expect(url).not.toMatch(/^(javascript|data:text|unsafe)/i);
            }

            expect(host.querySelector('site-gallery img')?.getAttribute('src')).toContain('_stock/');
        });

        it('harita adresi güvenliyse kullanılır, güvensizse kliniğin adresinden üretilir', async () => {
            const safe = await render(patchClinic(sampleConfig(), { mapUrl: 'https://harita.example.com/klinik' }));

            expect(safe.querySelector('site-map a')?.getAttribute('href')).toBe('https://harita.example.com/klinik');

            const unsafe = await render(patchClinic(sampleConfig(), { mapUrl: UNSAFE }));

            expect(unsafe.querySelector('site-map a')?.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
        });

        it('metinler düz metin çizilir, HTML olarak yorumlanmaz', async () => {
            const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
            const config = patchContent(patchClinic(sampleConfig(), { name: payload, slogan: payload, intro: payload }), {
                copy: { ...sampleConfig().content.copy, heroTitle: payload, aboutText: payload },
                services: [{ slug: 'x', title: payload, summary: payload, body: payload, image: null }],
                faqs: [{ question: payload, answer: payload }]
            });
            const host = await render(patchContent(config, { heroImage: null, aboutImage: null, gallery: [], members: [], articles: [] }));

            expect(host.querySelector('img[src="x"]')).toBeNull();
            expect(host.querySelector('script')).toBeNull();
            expect(host.textContent).toContain('<img src=x');
            expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
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

            expect(mirror.inputs.map((input) => input.templateName).sort()).toEqual(['baseHref', 'config', 'maxSections', 'path', 'viewportHeight']);
            expect(mirror.outputs.map((output) => output.templateName)).toEqual(['pathChange']);
        });

        it('iç bağlantı yalnız yolu değiştirir, sayfa aynı bileşende çizilir', async () => {
            const host = await render(sampleConfig());
            const link = host.querySelector<HTMLAnchorElement>('site-nav nav a[href="/hizmetler"]')!;

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

            expect((fixture.nativeElement as HTMLElement).querySelector('site-nav nav a')?.getAttribute('href')).toBe('/k/ornek/hizmetler');
        });

        it('küçük resim sınırlı sayıda bölüm çizer, alt şerit çizmez', async () => {
            const host = await render(sampleConfig(), { maxSections: 2 });

            expect(host.querySelectorAll('.slot').length).toBe(2);
            expect(host.querySelector('site-dock')).toBeNull();
        });

        it('galerideki yüklenen görsel hâlâ çizilir', async () => {
            const host = await render(patchContent(sampleConfig(), { gallery: [sampleImage('Tek kare')] }));

            expect(host.querySelectorAll('site-gallery img').length).toBe(1);
        });
    });
});
