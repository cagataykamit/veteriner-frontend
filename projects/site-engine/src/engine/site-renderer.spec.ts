import { provideZonelessChangeDetection, reflectComponentType } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SectionType, SiteConfig } from '../model/site.model';
import { emptyContent, forbiddenCopy, patchClinic, patchContent, sampleConfig, sampleImage, withoutImages } from '../testing/site-sample';
import { findAlternative, SECTION_REGISTRY, sectionAlternatives } from './section-registry';
import { designFromConcept, SITE_CONCEPTS } from './site-concepts';
import { SiteRendererComponent } from './site-renderer.component';

const SECTION_TYPES: readonly SectionType[] = ['nav', 'hero', 'about', 'services', 'team', 'features', 'gallery', 'guide', 'contact', 'footer'];
const SUB_PAGES = ['/hakkimizda', '/hizmetler', '/hizmetler/genel-muayene', '/hekimler', '/ekibimiz', '/saglik-rehberi', '/saglik-rehberi/ilk-ziyaret', '/galeri', '/iletisim', '/randevu', '/acil', '/sss', '/subelerimiz'];
const PACK_KEYS = SITE_CONCEPTS.map((concept) => concept.key);

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

    async function render(config: SiteConfig, inputs: { path?: string; only?: SectionType; width?: number } = {}): Promise<HTMLElement> {
        fixture?.destroy();
        fixture = TestBed.createComponent(SiteRendererComponent);
        fixture.componentRef.setInput('config', config);

        if (inputs.path) fixture.componentRef.setInput('path', inputs.path);

        if (inputs.only) fixture.componentRef.setInput('only', inputs.only);

        const host = fixture.nativeElement as HTMLElement;

        host.style.width = `${inputs.width ?? 1280}px`;
        await fixture.whenStable();

        return host;
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

    describe('görselsiz çizim', () => {
        for (const key of PACK_KEYS) {
            for (const width of [375, 1280]) {
                it(`${key}, ${width}px: görsel yokken kırık <img> çizilmez, metin taşmaz`, async () => {
                    const host = await render(withSections(withoutImages(sampleConfig()), key), { width });

                    expect(host.querySelectorAll('img').length).toBe(0);
                    expect(host.querySelector('h1')?.textContent?.trim().length).toBeGreaterThan(0);
                    expect(overflowing(host)).toEqual([]);
                });
            }

            it(`${key}: hekim kartında fotoğraf yoksa monogram çizilir`, async () => {
                const host = await render(withSections(withoutImages(sampleConfig()), key), { only: 'team' });

                expect(host.textContent).toContain('ÖH');
                expect(host.textContent).toContain('DK');
            });

            it(`${key}: yazıdaki hizmet ve rehber sayfaları görselsiz çizilir`, async () => {
                for (const path of ['/hizmetler/genel-muayene', '/saglik-rehberi/ilk-ziyaret', '/saglik-rehberi', '/hizmetler']) {
                    const host = await render(withSections(withoutImages(sampleConfig()), key), { path });

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

        it('galeri hazır fotoğrafla dolmaz: yükleme yoksa bölüm de sayfa da yoktur (K7)', async () => {
            const config = withoutImages(sampleConfig());

            for (const key of PACK_KEYS) {
                const host = await render(withSections(config, key));

                expect(host.querySelector(`site-${key}-gallery`), key).toBeNull();
                expect(host.textContent, key).not.toContain('Galeri');
            }

            expect((await render(config, { path: '/galeri' })).querySelector('.lost')).not.toBeNull();
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

                    for (const type of ['services', 'team', 'features', 'gallery', 'guide', 'contact'] as const) {
                        expect(host.querySelector(`site-${key}-${type}`), type).toBeNull();
                    }

                    expect(host.querySelectorAll('img').length).toBe(0);
                    expect(overflowing(host)).toEqual([]);
                });
            }
        }

        it('içeriği boş sayfa menüye girmez ve adresi "bulunamadı" olur', async () => {
            const host = await render(emptyContent(sampleConfig()));
            const menu = [...host.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

            expect(menu).toContain('/hakkimizda');

            for (const path of ['/hizmetler', '/hekimler', '/saglik-rehberi', '/galeri', '/sss', '/acil', '/ekibimiz', '/subelerimiz', '/iletisim']) {
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

                expect(host.querySelector(`site-${key}-gallery`), key).toBeNull();
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

                expect(host.querySelector('img'), key).toBeNull();
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

        it('üçüncü taraf font ve görsel adresine istek gitmez', async () => {
            const host = await render(sampleConfig());

            expect(document.head.querySelector('link[href*="fonts.g"]')).toBeNull();
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

            expect((fixture.nativeElement as HTMLElement).querySelector('site-modern-nav nav a')?.getAttribute('href')).toBe('/k/ornek/hakkimizda');
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
        });

        it('galerideki yüklenen görsel hâlâ çizilir', async () => {
            const host = await render(patchContent(sampleConfig(), { gallery: [sampleImage('Tek kare')] }), { only: 'gallery' });

            expect(host.querySelectorAll('img').length).toBe(1);
        });
    });
});
