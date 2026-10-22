import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from '@/app.routes';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { PUBLIC_FAQ_CATEGORIES, PUBLIC_HOME_FAQS } from '@/app/features/public/utils/public-faq-content.utils';
import { PUBLIC_FEATURE_SECTIONS } from '@/app/features/public/utils/public-features-content.utils';
import { PUBLIC_HOME_AUDIENCE, PUBLIC_HOME_DAY_FLOW } from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_NAV_LINKS, PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_REGISTERS } from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_SCREENSHOTS } from '@/app/features/public/utils/public-screenshots.utils';
import { formatPlanPrice, PRICING_FEATURE_ROWS, PRICING_NOT_AVAILABLE, PRICING_PLAN_DEFS } from '@/app/features/public/utils/pricing-plan.utils';
import {
    PUBLIC_ABOUT_PAGE_META,
    PUBLIC_CONTACT_PAGE_META,
    PUBLIC_FAQ_PAGE_META,
    PUBLIC_FEATURES_PAGE_META,
    PUBLIC_HOME_PAGE_META,
    PUBLIC_MIGRATION_PAGE_META,
    PUBLIC_OG_IMAGE_PATH,
    PUBLIC_PACKAGES_PAGE_META,
    PUBLIC_REGISTERS_PAGE_META,
    PUBLIC_SITE_ORIGIN
} from '@/app/features/public/utils/public-seo.utils';

/** Tanıtım sayfaları: ortak iskelet, rota, başlık ve içerik sabitleri. */
describe('Tanıtım sayfaları (PublicLayout)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        harness = await RouterTestingHarness.create();
    });

    const root = (): HTMLElement => harness.fixture.nativeElement as HTMLElement;
    const text = (selector: string): string => (root().querySelector(selector)?.textContent ?? '').trim();
    const texts = (selector: string): string[] => Array.from(root().querySelectorAll(selector)).map((el) => (el.textContent ?? '').trim());

    const pages = [
        { path: PUBLIC_PATHS.home, meta: PUBLIC_HOME_PAGE_META, h1: 'Veteriner kliniğinizin günü tek ekranda' },
        { path: PUBLIC_PATHS.features, meta: PUBLIC_FEATURES_PAGE_META, h1: 'Gelişten tahsilata bir günün akışı' },
        { path: PUBLIC_PATHS.registersAndKvkk, meta: PUBLIC_REGISTERS_PAGE_META, h1: 'Defterleriniz ve KVKK evrakınız kendiliğinden tutulur' },
        { path: PUBLIC_PATHS.migration, meta: PUBLIC_MIGRATION_PAGE_META, h1: 'Eski programdan geçiş yarım gün' },
        { path: PUBLIC_PATHS.packages, meta: PUBLIC_PACKAGES_PAGE_META, h1: 'Kliniğinize uygun paketi seçin' },
        { path: PUBLIC_PATHS.faq, meta: PUBLIC_FAQ_PAGE_META, h1: 'Sık sorulan sorular' },
        { path: PUBLIC_PATHS.contact, meta: PUBLIC_CONTACT_PAGE_META, h1: 'Demo isteyin ya da hemen deneyin' },
        { path: PUBLIC_PATHS.about, meta: PUBLIC_ABOUT_PAGE_META, h1: 'Küçük veteriner klinikleri için, klinikle birlikte' }
    ];

    for (const page of pages) {
        it(`${page.path}: girişsiz açılır, tek h1, sekme başlığı, üst çubuk ve alt bilgi iskeletten gelir`, async () => {
            await harness.navigateByUrl(page.path);
            harness.detectChanges();

            expect(TestBed.inject(Router).url).toBe(page.path);
            expect(TestBed.inject(Title).getTitle()).toBe(page.meta.title);
            expect(texts('h1')).toEqual([page.h1]);
            expect(root().querySelector('main#icerik')).not.toBeNull();
            expect(texts('header nav[aria-label="Ana navigasyon"] a')).toEqual(PUBLIC_NAV_LINKS.map((l) => l.label));
            expect(root().querySelector('footer a[href="/gizlilik"]')).not.toBeNull();
        });

        it(`${page.path}: ön sürüm ve yer tutucu dili yok (pilot, yakında, "ekran görüntüsü gelecek", AK-6)`, async () => {
            await harness.navigateByUrl(page.path);
            harness.detectChanges();

            const body = root().textContent ?? '';

            expect(body).not.toMatch(/pilot/i);
            expect(body).not.toMatch(/yakında/i);
            expect(body).not.toMatch(/ekran görüntüsü gelecek/i);
            expect(body).not.toMatch(/fiyat için (bize )?yazın/i);
            expect(body).not.toContain('AK-6');
        });
    }

    it('tanıtım iskeleti kök yazı boyutu sınıfını ekler; auth sayfasına geçince kaldırır', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.home);

        expect(document.documentElement.classList.contains('public-site-root')).toBeTrue();

        await harness.navigateByUrl('/auth/login');

        expect(document.documentElement.classList.contains('public-site-root')).toBeFalse();
    });

    it('/pricing eski adresi /paketler sayfasına yönlendirir', async () => {
        await harness.navigateByUrl('/pricing');

        expect(TestBed.inject(Router).url).toBe(PUBLIC_PATHS.packages);
    });

    it('özellikler: altı bölüm, her birinde gerçek ekran görüntüsü (alt metni, boyut, tembel yükleme)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        expect(texts('section[id] h2')).toEqual(PUBLIC_FEATURE_SECTIONS.map((s) => s.title));
        const images = Array.from(root().querySelectorAll<HTMLImageElement>('figure.public-shot img.public-shot-img--light'));

        expect(images.map((img) => img.alt)).toEqual(PUBLIC_FEATURE_SECTIONS.map((s) => PUBLIC_SCREENSHOTS[s.screenshot].alt));
        images.forEach((img, i) => {
            const def = PUBLIC_SCREENSHOTS[PUBLIC_FEATURE_SECTIONS[i].screenshot];

            expect(img.getAttribute('src')).toBe(`/marketing/screens/${def.file}-light.webp`);
            expect(img.getAttribute('width')).toBe(String(def.width));
            expect(img.getAttribute('height')).toBe(String(def.height));
            expect(img.getAttribute('loading')).toBe('lazy');
        });
        expect(root().querySelectorAll('figure.public-shot img.public-shot-img--dark').length).toBe(PUBLIC_FEATURE_SECTIONS.length);
    });

    it('defterler: tablo tüm defterleri listeler; "mevzuata uygun" ve "KVKK uyumlu" yazmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.registersAndKvkk);
        harness.detectChanges();

        expect(texts('tbody th')).toEqual(PUBLIC_REGISTERS.map((r) => r.name));
        const body = root().textContent ?? '';

        expect(body).not.toContain('mevzuata uygun');
        expect(body).not.toContain('KVKK uyumlu');
    });

    it('paketler: üç paket kartı veriden; fiyatlı paket kayda, teklifli paket iletişime gider', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);
        harness.detectChanges();

        expect(texts('[data-plan] h3')).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));

        for (const p of PRICING_PLAN_DEFS) {
            const card = root().querySelector(`[data-plan="${p.slug}"]`)!;

            if (p.priceOnRequest) {
                expect(card.textContent).toContain('İletişime geçin');
                expect(card.querySelector(`a[href="${PUBLIC_PATHS.contact}"]`)).not.toBeNull();
            } else {
                expect(card.textContent).toContain(formatPlanPrice(p.monthlyPriceTry)!);
                expect(card.querySelector(`a[href="/auth/signup?plan=${p.slug}"]`)).not.toBeNull();
            }
        }

        expect(root().textContent).not.toContain('Fiyat yakında');
    });

    it('paketler: yalnız aylık fiyat (dönem seçici, yıllık tutar ve indirim yok); karşılaştırma tablosu tüm özellik satırlarını gösterir', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);
        harness.detectChanges();

        const prices = texts('[data-plan], table.public-plan-table').join(' ');

        expect(root().querySelector('[aria-label="Ödeme dönemi"]')).toBeNull();
        expect(prices).not.toMatch(/yıllık|\/ yıl|hediye/i);
        expect(prices).toContain('/ ay');
        expect(root().textContent).not.toMatch(/hediye|indirim/i);
        const rowHeaders = texts('table.public-plan-table tbody th[scope="row"]');

        PRICING_FEATURE_ROWS.forEach((r) => expect(rowHeaders.some((t) => t.startsWith(r.label))).withContext(r.label).toBeTrue());
        expect(texts('#packages-not-title + ul li')).toEqual([...PRICING_NOT_AVAILABLE]);
    });

    it('paketler: SoftwareApplication JSON-LD fiyatları paket verisinden (KDV hariç)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);

        const data = JSON.parse(document.head.querySelector('script[data-public-json-ld="packages-offers"]')?.textContent ?? '{}');
        const priced = PRICING_PLAN_DEFS.filter((p) => p.monthlyPriceTry != null);

        expect(data.offers.map((o: { name: string; price: number }) => [o.name, o.price])).toEqual(priced.map((p) => [p.title, p.monthlyPriceTry]));
        expect(data.offers[0].priceSpecification.valueAddedTaxIncluded).toBeFalse();
    });

    it('sss: kategori sekmeleri; seçilen kategorinin soruları görünür', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.faq);
        harness.detectChanges();

        expect(texts('[role="tab"]')).toEqual(PUBLIC_FAQ_CATEGORIES.map((c) => c.label));
        expect(texts('[role="tabpanel"] h3')).toEqual(PUBLIC_FAQ_CATEGORIES[0].items.map((i) => i.question));

        root().querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
        harness.detectChanges();

        expect(texts('[role="tabpanel"] h3')).toEqual(PUBLIC_FAQ_CATEGORIES[1].items.map((i) => i.question));
    });

    it('ana sayfa SSS listesi tek kaynaktan (6–8 soru) gelir', () => {
        expect(PUBLIC_HOME_FAQS.length).toBeGreaterThanOrEqual(6);
        expect(PUBLIC_HOME_FAQS.length).toBeLessThanOrEqual(8);
    });

    it('iletişim: e-posta girilmemişken mailto ve boş iletişim kartı yok; deneme kartı gösterilir', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.contact);
        harness.detectChanges();

        expect(root().querySelector('a[href^="mailto:"]')).toBeNull();
        expect(root().querySelector('#contact-card-title')).toBeNull();
        expect(text('#contact-try-title')).toBe('Kendi verinizle deneyin');
        expect(root().querySelector('section[aria-labelledby="contact-try-title"] a[href="/auth/signup"]')).not.toBeNull();
        expect(root().querySelector('form')).toBeNull();
    });
});

/** Ana sayfa omurgası (tasarım belgesi 5.1). */
describe('Ana sayfa (PublicHomePage)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(PUBLIC_PATHS.home);
        harness.detectChanges();
    });

    const root = (): HTMLElement => harness.fixture.nativeElement as HTMLElement;
    const texts = (selector: string): string[] => Array.from(root().querySelectorAll(selector)).map((el) => (el.textContent ?? '').trim());

    it('bölümler sırayla: kime göre, akış, Türkiye, güvenlik, geçiş, paketler, SSS, çağrı', () => {
        expect(texts('main section h2')).toEqual([
            'Kime göre?',
            'Bir günün akışı',
            "Türkiye'ye özgü",
            'Kayıtlarınız güvende ve dürüst',
            'Eski programdan geçiş yarım gün',
            'Paketler',
            'Sık sorulan sorular',
            '14 gün ücretsiz deneyin'
        ]);
    });

    it('kahraman: iki düğme (deneme ve demo) ve deneme satırı; sahte önizleme yok', () => {
        const hero = root().querySelector('section[aria-labelledby="public-home-hero-title"]')!;

        expect(hero.querySelector('a[href="/auth/signup"]')?.textContent?.trim()).toBe('Ücretsiz dene');
        expect(hero.querySelector(`a[href="${PUBLIC_PATHS.contact}"]`)?.textContent?.trim()).toBe('Demo iste');
        expect(hero.textContent).toContain('14 gün ücretsiz · kart gerekmez · satış görüşmesi yok');
        expect(root().textContent).not.toContain('Panel önizleme');
        const shot = hero.querySelector<HTMLImageElement>('figure.public-shot img.public-shot-img--light');

        expect(shot?.alt).toBe(PUBLIC_SCREENSHOTS.bugun.alt);
        expect(shot?.getAttribute('loading')).toBe('eager');
    });

    it('kime göre: üç kart, hastane yok', () => {
        expect(texts('section[aria-labelledby="public-home-audience-title"] h3')).toEqual(PUBLIC_HOME_AUDIENCE.map((a) => a.title));
        expect(root().textContent).not.toMatch(/hastane/i);
    });

    it('günün akışı: dört sekme; sekme değişince ekran görüntüsü değişir', () => {
        const tabs = root().querySelectorAll<HTMLButtonElement>('[aria-label="Günün adımları"] [role="tab"]');

        expect(Array.from(tabs).map((t) => t.querySelectorAll('span')[1].textContent?.trim())).toEqual(PUBLIC_HOME_DAY_FLOW.map((s) => s.title));
        const panelImg = (): HTMLImageElement | null => root().querySelector('[id^="flow-panel-"] img.public-shot-img--light');

        expect(panelImg()?.alt).toBe(PUBLIC_SCREENSHOTS[PUBLIC_HOME_DAY_FLOW[0].screenshot].alt);

        tabs[2].click();
        harness.detectChanges();

        expect(tabs[2].getAttribute('aria-selected')).toBe('true');
        expect(panelImg()?.alt).toBe(PUBLIC_SCREENSHOTS[PUBLIC_HOME_DAY_FLOW[2].screenshot].alt);
    });

    it('paketler bölümü: kartlar paket verisinden; "yakında" ya da yol haritası reklamı yok', () => {
        expect(texts('section[aria-labelledby="public-home-packages-title"] [data-plan] h3')).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));
        const body = root().textContent ?? '';

        expect(body).not.toMatch(/yakında|yol haritası/i);
        expect(body).not.toContain('mağazada');
        expect(body).not.toContain('mevzuata uygun');
        expect(body).not.toContain('KVKK uyumlu');
        expect(body).not.toContain('Türkiye veri merkezi');
    });

    it('SSS: 6–8 soru, tek kaynaktan; fiyat yanıtı tutarları paket verisinden alır', () => {
        const questions = texts('section[aria-labelledby="public-home-faq-title"] h3');
        const answer = PUBLIC_HOME_FAQS.find((f) => f.question === 'Fiyat ne kadar?')?.answer ?? '';

        expect(questions).toEqual(PUBLIC_HOME_FAQS.map((f) => f.question));
        PRICING_PLAN_DEFS.filter((p) => p.monthlyPriceTry != null).forEach((p) => expect(answer).toContain(formatPlanPrice(p.monthlyPriceTry)!));
        expect(answer).toContain('KDV hariç');
        expect(answer).not.toMatch(/pilot/i);
    });
});

/** WEB-003: sabit canonical, OG/Twitter, FAQPage JSON-LD. */
describe('Tanıtım SEO (WEB-003)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        harness = await RouterTestingHarness.create();
    });

    const head = (): HTMLHeadElement => document.head;

    it('canonical sabit https://www.vetinity.com + yol (origin değil); og:url aynı', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);

        expect(head().querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${PUBLIC_SITE_ORIGIN}${PUBLIC_PATHS.packages}`);
        expect(head().querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(`${PUBLIC_SITE_ORIGIN}${PUBLIC_PATHS.packages}`);
        expect(head().querySelector('link[rel="canonical"]')?.getAttribute('href')).not.toContain(window.location.origin);
    });

    it('og:image mutlak adres (JPEG, SVG değil) ve twitter kartı summary_large_image', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.home);

        expect(PUBLIC_OG_IMAGE_PATH).toMatch(/\.jpg$/);

        expect(head().querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(`${PUBLIC_SITE_ORIGIN}${PUBLIC_OG_IMAGE_PATH}`);
        expect(head().querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
    });

    it('ana sayfa FAQPage JSON-LD yazar (SSS ile aynı sorular), sayfadan ayrılınca kaldırır', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.home);

        const script = head().querySelector('script[type="application/ld+json"][data-public-json-ld="home-faq"]');

        expect(script).not.toBeNull();
        const data = JSON.parse(script!.textContent ?? '{}');

        expect(data['@type']).toBe('FAQPage');
        expect(data.mainEntity.map((q: { name: string }) => q.name)).toEqual(PUBLIC_HOME_FAQS.map((f) => f.question));

        await harness.navigateByUrl(PUBLIC_PATHS.about);

        expect(head().querySelector('script[data-public-json-ld="home-faq"]')).toBeNull();
    });

    it('tanıtım sayfaları robots noindex taşımaz (staging bayrağı kapalı)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);

        expect(head().querySelector('meta[name="robots"]')).toBeNull();
    });
});
