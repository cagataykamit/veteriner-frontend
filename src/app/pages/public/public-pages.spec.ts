import { ViewportScroller } from '@angular/common';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PUBLIC_ANCHOR_SCROLL_OFFSET_PX, PublicLayoutComponent } from './public-layout.component';
import { appRoutes } from '@/app.routes';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { PUBLIC_CONTACT_CARD_ROWS, PUBLIC_CONTACT_EMAIL } from '@/app/features/public/utils/public-contact-content.utils';
import { PUBLIC_FAQ_CATEGORIES, PUBLIC_HOME_FAQS, PUBLIC_PACKAGES_FAQ_CATEGORY_ID, publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import { PUBLIC_FEATURE_GROUPS, PUBLIC_FEATURE_SECTIONS } from '@/app/features/public/utils/public-features-content.utils';
import { PUBLIC_HOME_AUDIENCE, PUBLIC_HOME_DAY_FLOW } from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_NAV_LINKS, PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_REGISTERS } from '@/app/features/public/utils/public-registers-content.utils';
import { PUBLIC_SCREENSHOTS } from '@/app/features/public/utils/public-screenshots.utils';
import { PRICING_FEATURE_ROWS, PRICING_NOT_AVAILABLE, PRICING_ON_REQUEST_TEXT, PRICING_PLAN_DEFS } from '@/app/entities/subscription/utils/pricing-plan.utils';
import type { PublicSubscriptionPlanCatalogDto } from '@/app/features/public/models/public-plan-catalog-api.model';
import { PUBLIC_ABOUT_PAGE_META, PUBLIC_CONTACT_PAGE_META, PUBLIC_FAQ_PAGE_META, PUBLIC_FEATURES_PAGE_META, PUBLIC_HOME_PAGE_META, PUBLIC_LOGO_PATH, PUBLIC_MIGRATION_PAGE_META, PUBLIC_OG_IMAGE_PATH, PUBLIC_PACKAGES_PAGE_META, PUBLIC_REGISTERS_PAGE_META, PUBLIC_SITE_ORIGIN, publicOrganizationJsonLd } from '@/app/features/public/utils/public-seo.utils';

/** Backend paket kataloğu yanıtı (WEB-007 sözleşmesi §2); sayfa sayıları yalnız buradan çizer. */
const PLAN_CATALOG: PublicSubscriptionPlanCatalogDto = {
    currency: 'TRY',
    vatIncluded: false,
    yearlyBilledMonths: 10,
    plans: [
        { planCode: 'Basic', name: 'Basic', maxUsers: 3, monthlyPriceMinor: 89000, yearlyPriceMinor: 890000 },
        { planCode: 'Pro', name: 'Pro', maxUsers: 5, monthlyPriceMinor: 179000, yearlyPriceMinor: 1790000 },
        { planCode: 'Premium', name: 'Premium', maxUsers: 15, monthlyPriceMinor: 379000, yearlyPriceMinor: 3790000 }
    ]
};

/** Bekleyen paket kataloğu isteğini yanıtlar (`'error'`: API'ye ulaşılamadı). */
function flushPlanCatalog(body: PublicSubscriptionPlanCatalogDto | 'error'): void {
    const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/api/v1/public/subscription-plans'));

    if (body === 'error') {
        request.error(new ProgressEvent('error'));
    } else {
        request.flush(body);
    }
}

/** Tanıtım sayfaları: ortak iskelet, rota, başlık ve içerik sabitleri. */
describe('Tanıtım sayfaları (PublicLayout)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        harness = await RouterTestingHarness.create();
    });

    const root = (): HTMLElement => harness.fixture.nativeElement as HTMLElement;
    const text = (selector: string): string => (root().querySelector(selector)?.textContent ?? '').trim();
    const texts = (selector: string): string[] => Array.from(root().querySelectorAll(selector)).map((el) => (el.textContent ?? '').trim());

    const openPackages = async (catalog: PublicSubscriptionPlanCatalogDto | 'error' = PLAN_CATALOG): Promise<void> => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);
        flushPlanCatalog(catalog);
        harness.detectChanges();
    };

    const pages = [
        { path: PUBLIC_PATHS.home, meta: PUBLIC_HOME_PAGE_META, h1: 'Veteriner kliniğinizin günü tek ekranda' },
        { path: PUBLIC_PATHS.features, meta: PUBLIC_FEATURES_PAGE_META, h1: 'Gelişten tahsilata bir günün akışı' },
        { path: PUBLIC_PATHS.registersAndKvkk, meta: PUBLIC_REGISTERS_PAGE_META, h1: 'Defterleriniz ve KVKK evrakınız kendiliğinden tutulur' },
        { path: PUBLIC_PATHS.migration, meta: PUBLIC_MIGRATION_PAGE_META, h1: 'Eski programdan geçiş yarım gün' },
        { path: PUBLIC_PATHS.packages, meta: PUBLIC_PACKAGES_PAGE_META, h1: 'Kliniğinize uygun paketi seçin' },
        { path: PUBLIC_PATHS.faq, meta: PUBLIC_FAQ_PAGE_META, h1: 'Sık sorulan sorular' },
        { path: PUBLIC_PATHS.contact, meta: PUBLIC_CONTACT_PAGE_META, h1: 'Demo isteyin ya da hemen deneyin' },
        { path: PUBLIC_PATHS.about, meta: PUBLIC_ABOUT_PAGE_META, h1: 'Veteriner klinikleri için, klinikle birlikte' }
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

        expect(document.documentElement.classList.contains('public-site-root')).toBe(true);

        await harness.navigateByUrl('/auth/login');

        expect(document.documentElement.classList.contains('public-site-root')).toBe(false);
    });

    it('/pricing eski adresi /paketler sayfasına yönlendirir', async () => {
        await harness.navigateByUrl('/pricing');

        expect(TestBed.inject(Router).url).toBe(PUBLIC_PATHS.packages);
    });

    it('özellikler: altı bölüm ve ekranlı kart grupları, her birinde gerçek ekran görüntüsü (alt metni, boyut, tembel yükleme)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        expect(texts('section[id] h2')).toEqual([...PUBLIC_FEATURE_SECTIONS, ...PUBLIC_FEATURE_GROUPS].map((s) => s.title));
        const shots = [...PUBLIC_FEATURE_SECTIONS.map((s) => s.screenshot), ...PUBLIC_FEATURE_GROUPS.flatMap((g) => (g.shot ? [g.shot.screenshot] : []))];
        const images = Array.from(root().querySelectorAll<HTMLImageElement>('figure.public-shot img.public-shot-img--light'));

        expect(shots.length).toBeGreaterThan(PUBLIC_FEATURE_SECTIONS.length);
        expect(images.map((img) => img.alt)).toEqual(shots.map((key) => PUBLIC_SCREENSHOTS[key].alt));
        images.forEach((img, i) => {
            const def = PUBLIC_SCREENSHOTS[shots[i]];

            expect(img.getAttribute('src')).toBe(`/marketing/screens/${def.file}-light.webp`);
            expect(img.getAttribute('width')).toBe(String(def.width));
            expect(img.getAttribute('height')).toBe(String(def.height));
            expect(img.getAttribute('loading')).toBe('lazy');
        });
        expect(root().querySelectorAll('figure.public-shot img.public-shot-img--dark').length).toBe(shots.length);
    });

    it('özellikler: grup ekranının altyazısı gösterdiği kartın adı ve paketi, özellik tablosundan', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        const caption = (id: string) => root().querySelector(`section#${id} figcaption`)?.textContent?.trim();

        expect(caption('klinik-ici')).toBe('Otomatik aşı sihirbazı · Profesyonel ve Kurumsal paketlerinde');
        expect(caption('hasta-sahibi')).toBe('Klinik web sitesi · Tüm paketlerde');
        expect(caption('isletme')).toBe('Gelişmiş raporlar · Profesyonel ve Kurumsal paketlerinde');
    });

    it('özellikler: bölüm dizini aynı sayfanın bölümüne gider, ana sayfaya atmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        const hrefs = Array.from(root().querySelectorAll<HTMLAnchorElement>('nav[aria-label="Bölüm dizini"] a')).map((a) => a.getAttribute('href'));

        expect(hrefs).toEqual([...PUBLIC_FEATURE_SECTIONS, ...PUBLIC_FEATURE_GROUPS].map((s) => `${PUBLIC_PATHS.features}#${s.id}`));
    });

    it('özellikler: kart gruplarında paket etiketi özellik tablosundan; abartı yok', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        const cards = Array.from(root().querySelectorAll<HTMLElement>('[data-feature-card]'));
        const plans = (title: string) => cards.find((c) => c.querySelector('h3')?.textContent?.trim() === title)?.querySelector('[data-feature-plans]')?.textContent?.trim();

        expect(cards.length).toBe(PUBLIC_FEATURE_GROUPS.flatMap((g) => g.cards).length);
        expect(plans('Klinik web sitesi')).toBe('Tüm paketlerde');
        expect(plans('Çoklu kasa ve kasa yönetimi')).toBe('Profesyonel ve Kurumsal paketlerinde');
        expect(plans('Şubeler özeti')).toBe('Kurumsal paketinde');
        expect(root().textContent).toContain('İYS');
        expect(root().textContent).not.toMatch(/en iyi|bir numara|yalnızca bizde/i);
    });

    it('geçiş: kaynak program adımı ve geçiş desteği kutusu (Kurumsal ücretsiz, diğerleri ücretli)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.migration);
        harness.detectChanges();

        expect(text('.public-timeline-item h2')).toBe('Kaynak programı seçin, dosyanızı yükleyin');
        const support = root().querySelector('[data-testid="migration-support"]')?.textContent ?? '';

        expect(support).toContain('1 saatlik kurulum görüşmesi');
        expect(support).toContain('Kurumsal paketinde ücretsiz');
        expect(support).toContain('e-postayla göndermezsiniz');
    });

    it('geçiş: aktarılır / aktarılmaz listeleri geçiş sayfasında ve ana sayfada aynı', async () => {
        const included = ['Müşteri ve hasta notları', 'Geçmiş işlem ve kontroller (dışa aktarımda varsa, klinik geçmişe not olarak)', 'Açık bakiye (borç ve alacak)', 'Ürün ve hizmet kartları (fiyat, KDV oranı ve alış fiyatıyla)'];
        const excluded = 'Geçmiş randevular (randevu olarak)';

        for (const path of [PUBLIC_PATHS.migration, PUBLIC_PATHS.home]) {
            await harness.navigateByUrl(path);
            harness.detectChanges();
            const items = texts('li span');

            expect(items).toEqual(expect.arrayContaining([...included, excluded]));
            expect(root().textContent).not.toMatch(/alacak \(fazla ödeme\)|alacak bakiyesi/i);
        }
    });

    it('defterler ve KVKK: tüm veriyi dışa aktarma bölümü her pakette', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.registersAndKvkk);
        harness.detectChanges();

        expect(text('#data-export-title')).toBe('Tüm verinizi dışa aktarın');
        expect(root().querySelector('section[aria-labelledby="data-export-title"]')?.textContent).toContain('Tüm paketlerde');
        expect(texts('[data-testid="data-export-points"] li').length).toBe(4);
    });

    it('iskelet: bölüm bağlantısı üst çubuğun altına kayar, panele dönünce kaydırma payı sıfırlanır', () => {
        const setOffset = vi.spyOn(TestBed.inject(ViewportScroller), 'setOffset');
        const fixture = TestBed.createComponent(PublicLayoutComponent);

        fixture.componentInstance.ngOnInit();
        expect(setOffset).toHaveBeenLastCalledWith([0, PUBLIC_ANCHOR_SCROLL_OFFSET_PX]);

        fixture.destroy();
        expect(setOffset).toHaveBeenLastCalledWith([0, 0]);
    });

    it('defterler: tablo tüm defterleri listeler; "mevzuata uygun" ve "KVKK uyumlu" yazmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.registersAndKvkk);
        harness.detectChanges();

        expect(texts('tbody th')).toEqual(PUBLIC_REGISTERS.map((r) => r.name));
        const body = root().textContent ?? '';

        expect(body).not.toContain('mevzuata uygun');
        expect(body).not.toContain('KVKK uyumlu');
    });

    it('paketler: üç paket kartı; aylık fiyat ve kullanıcı sınırı backend kataloğundan (WEB-007), klinik sınırı yok; her paket kayda gider', async () => {
        await openPackages();

        expect(texts('[data-plan] h3')).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));
        const expected: Record<string, readonly [string, string]> = { basic: ['₺890', '3 kullanıcı'], pro: ['₺1.790', '5 kullanıcı'], premium: ['₺3.790', '15 kullanıcı'] };

        for (const p of PRICING_PLAN_DEFS) {
            const card = root().querySelector(`[data-plan="${p.slug}"]`)!;

            expect(card.textContent).toContain(expected[p.slug][0]);
            expect(card.textContent).toContain(expected[p.slug][1]);
            expect(card.textContent).toContain('KDV hariç');
            expect(card.textContent).not.toMatch(/\d+ klinik|Sınırsız/);
            expect(card.querySelector(`a[href="/auth/signup?plan=${p.slug}"]`)).not.toBeNull();
        }

        expect(root().textContent).not.toContain('Fiyat yakında');
        expect(root().textContent).not.toContain('İletişime geçin');
    });

    it('paketler: katalog alınamazsa sabit sayı yerine "Fiyat için bize yazın" (iletişim); anahtar yok, tablo başlığında fiyat ve kullanıcı yok', async () => {
        await openPackages('error');

        const cards = root().querySelectorAll('[data-plan]');

        expect(cards.length).toBe(3);
        cards.forEach((card) => {
            expect(card.querySelector(`a[href="${PUBLIC_PATHS.contact}"]`)?.textContent?.trim()).toBe(PRICING_ON_REQUEST_TEXT);
            expect(card.textContent).not.toContain('₺');
        });
        expect(root().querySelector('[aria-label="Ödeme dönemi"]')).toBeNull();
        expect(root().querySelector('table.public-plan-compare')?.textContent).not.toMatch(/₺|\d+ kullanıcı/);
        expect(document.head.querySelector('script[data-public-json-ld="packages-offers"]')).toBeNull();
    });

    it('paketler: Aylık/Yıllık anahtarı (BILL-001) aylıkla açılır, yıllıkta katalogdaki yıllık tutar; karşılaştırma tablosu tüm özellik satırlarını gösterir', async () => {
        await openPackages();

        const cardPrices = () => texts('[data-plan]').join(' ');
        const toggle = root().querySelector('[aria-label="Ödeme dönemi"]');

        expect(toggle).not.toBeNull();
        expect(cardPrices()).toContain('/ ay');
        expect(cardPrices()).not.toMatch(/\/ yıl/);
        expect(root().textContent).not.toMatch(/indirim/i);

        const yearly = Array.from(toggle!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yıllık')!;

        yearly.click();
        harness.detectChanges();

        expect(yearly.getAttribute('aria-pressed')).toBe('true');
        expect(cardPrices()).toContain('₺8.900');
        expect(cardPrices()).toContain('₺37.900');
        expect(cardPrices()).toContain('/ yıl');
        expect(cardPrices()).toContain('2 ay hediye');
        const table = root().querySelector('table.public-plan-compare')!;
        const rowHeaders = texts('table.public-plan-compare tbody th[scope="row"]');

        expect(texts('table.public-plan-compare thead th')[2]).toContain('₺1.790');
        expect(table.textContent).not.toMatch(/Yıllık|\/ yıl|₺17\.900/);
        expect(rowHeaders.length).toBe(PRICING_FEATURE_ROWS.length);
        PRICING_FEATURE_ROWS.forEach((r) => expect(rowHeaders.some((t) => t.startsWith(r.label)), r.label).toBe(true));
        expect(texts('#packages-not-title + ul li')).toEqual([...PRICING_NOT_AVAILABLE]);
    });

    it('paketler: SoftwareApplication JSON-LD fiyatları backend kataloğundan (KDV hariç)', async () => {
        await openPackages();

        const data = JSON.parse(document.head.querySelector('script[data-public-json-ld="packages-offers"]')?.textContent ?? '{}');

        expect(data.offers.map((o: {
            name: string;
            price: number;
        }) => [o.name, o.price])).toEqual([
            ['Temel', 890],
            ['Profesyonel', 1790],
            ['Kurumsal', 3790]
        ]);
        expect(data.offers[0].priceSpecification.valueAddedTaxIncluded).toBe(false);
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

    it('iletişim: demo formu, deneme kartı ve yalnız girilmiş satırlarla iletişim kartı (e-posta mailto bağlantısı)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.contact);
        harness.detectChanges();

        expect(text('#contact-card-title')).toBe('İletişim bilgileri');
        expect(texts('section[aria-labelledby="contact-card-title"] dt')).toEqual(PUBLIC_CONTACT_CARD_ROWS.map((r) => r.label));
        expect(root().querySelector(`section[aria-labelledby="contact-card-title"] a[href="mailto:${PUBLIC_CONTACT_EMAIL}"]`)?.textContent?.trim()).toBe(PUBLIC_CONTACT_EMAIL!);
        const whatsapp = root().querySelector<HTMLAnchorElement>('section[aria-labelledby="contact-card-title"] a[href="https://wa.me/905439580091"]');

        expect(whatsapp?.textContent?.trim()).toBe('0543 958 00 91');
        expect(whatsapp?.getAttribute('target')).toBe('_blank');
        expect(whatsapp?.getAttribute('rel')).toContain('noopener');
        expect(text('#demo-request-title')).toBe('Canlı demo isteyin');
        expect(root().querySelector('section[aria-labelledby="demo-request-title"] form')).not.toBeNull();
        expect(text('#contact-try-title')).toBe('Kendi verinizle deneyin');
        expect(root().querySelector('section[aria-labelledby="contact-try-title"] a[href="/auth/signup"]')).not.toBeNull();
    });
});

/** Ana sayfa omurgası (tasarım belgesi 5.1). */
describe('Ana sayfa (PublicHomePage)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
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
        const phone = hero.querySelector<HTMLImageElement>('[data-hero-phone] img.public-shot-img--light');

        expect(phone?.alt).toBe(PUBLIC_SCREENSHOTS.telefonBugun.alt);
        expect(phone?.getAttribute('loading')).toBe('lazy');
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
        expect(root().querySelector('table.public-plan-compare')).toBeNull();
        expect(root().querySelector(`section[aria-labelledby="public-home-packages-title"] a[href="${PUBLIC_PATHS.packages}"]`)?.textContent?.trim()).toBe('Paketleri karşılaştırın');
    });

    it('SSS: 6–8 soru, tek kaynaktan; fiyat yanıtı tutar yazmaz, Paketler sayfasına yollar (fiyat backend kataloğunda, WEB-007)', () => {
        const questions = texts('section[aria-labelledby="public-home-faq-title"] h3');
        const answer = PUBLIC_HOME_FAQS.find((f) => f.question === 'Fiyat ne kadar?')?.answer ?? '';

        expect(questions).toEqual(PUBLIC_HOME_FAQS.map((f) => f.question));
        expect(answer).toContain('Paketler sayfasında');
        expect(answer).toContain('KDV hariç');
        expect(answer).not.toMatch(/₺|\d{3,}/);
        expect(answer).not.toMatch(/pilot/i);
    });

    it('paketler bölümü: aylık fiyat ve kullanıcı sınırı backend kataloğundan', () => {
        flushPlanCatalog(PLAN_CATALOG);
        harness.detectChanges();
        const section = root().querySelector('section[aria-labelledby="public-home-packages-title"]')!;

        expect(section.querySelector('[data-plan="pro"]')?.textContent).toContain('₺1.790');
        expect(section.querySelector('[data-plan="premium"]')?.textContent).toContain('15 kullanıcı');
        expect(section.querySelector('[aria-label="Ödeme dönemi"]')).toBeNull();
    });
});

/** WEB-003: sabit canonical, OG/Twitter, FAQPage JSON-LD. */
describe('Tanıtım SEO (WEB-003)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter(appRoutes), provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
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
        expect(data.mainEntity.map((q: {
            name: string;
        }) => q.name)).toEqual(PUBLIC_HOME_FAQS.map((f) => f.question));

        await harness.navigateByUrl(PUBLIC_PATHS.about);

        expect(head().querySelector('script[data-public-json-ld="home-faq"]')).toBeNull();
    });

    it('ana sayfa Organization JSON-LD yazar (ad, sabit canlı kök, PNG logo, iletişim e-postası), sayfadan ayrılınca kaldırır', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.home);

        const data = JSON.parse(head().querySelector('script[type="application/ld+json"][data-public-json-ld="home-organization"]')?.textContent ?? '{}');

        expect(data['@type']).toBe('Organization');
        expect(data.name).toBe('Vetinity');
        expect(data.url).toBe(`${PUBLIC_SITE_ORIGIN}/`);
        expect(data.logo).toBe(`${PUBLIC_SITE_ORIGIN}${PUBLIC_LOGO_PATH}`);
        expect(data.logo).toMatch(/\.png$/);
        expect(data.contactPoint).toEqual([{ '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: 'Turkish', email: PUBLIC_CONTACT_EMAIL }]);

        await harness.navigateByUrl(PUBLIC_PATHS.faq);

        expect(head().querySelector('script[data-public-json-ld="home-organization"]')).toBeNull();
    });

    it('Organization verisinde değeri olmayan iletişim kanalı yazılmaz; hiç kanal yoksa contactPoint yok', () => {
        expect(publicOrganizationJsonLd(null, '+90 212 000 00 00')['contactPoint']).toEqual([{ '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: 'Turkish', telephone: '+90 212 000 00 00' }]);
        expect(publicOrganizationJsonLd(null, null)).not.toHaveProperty('contactPoint');
    });

    it('SSS sayfası FAQPage JSON-LD yazar; ana sayfa ve paketler sayfasında işaretlenen sorular tekrarlanmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.faq);

        const data = JSON.parse(head().querySelector('script[type="application/ld+json"][data-public-json-ld="faq-page"]')?.textContent ?? '{}');
        const names: string[] = data.mainEntity.map((q: { name: string }) => q.name);
        const markedElsewhere = new Set([...PUBLIC_HOME_FAQS, ...publicFaqsOf(PUBLIC_PACKAGES_FAQ_CATEGORY_ID)].map((f) => f.question));
        const all = PUBLIC_FAQ_CATEGORIES.flatMap((c) => c.items.map((i) => i.question));

        expect(data['@type']).toBe('FAQPage');
        expect(names.length).toBeGreaterThan(0);
        expect(names.filter((n) => markedElsewhere.has(n))).toEqual([]);
        expect(names).toEqual(all.filter((q) => !markedElsewhere.has(q)));

        await harness.navigateByUrl(PUBLIC_PATHS.home);

        expect(head().querySelector('script[data-public-json-ld="faq-page"]')).toBeNull();
    });

    it('tanıtım sayfaları robots noindex taşımaz (staging bayrağı kapalı)', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);

        expect(head().querySelector('meta[name="robots"]')).toBeNull();
    });
});
