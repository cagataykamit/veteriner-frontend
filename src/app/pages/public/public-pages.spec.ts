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
import { PUBLIC_HOME_AUDIENCE, PUBLIC_HOME_DAY_FLOW, PUBLIC_HOME_ROADMAP } from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_NAV_LINKS, PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_REGISTERS } from '@/app/features/public/utils/public-registers-content.utils';
import {
    PUBLIC_ABOUT_PAGE_META,
    PUBLIC_CONTACT_PAGE_META,
    PUBLIC_FAQ_PAGE_META,
    PUBLIC_FEATURES_PAGE_META,
    PUBLIC_HOME_PAGE_META,
    PUBLIC_MIGRATION_PAGE_META,
    PUBLIC_PACKAGES_PAGE_META,
    PUBLIC_REGISTERS_PAGE_META
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
        { path: PUBLIC_PATHS.packages, meta: PUBLIC_PACKAGES_PAGE_META, h1: 'Pilot dönemi: tüm özellikler, tek paket' },
        { path: PUBLIC_PATHS.faq, meta: PUBLIC_FAQ_PAGE_META, h1: 'Sık sorulan sorular' },
        { path: PUBLIC_PATHS.contact, meta: PUBLIC_CONTACT_PAGE_META, h1: 'Demo isteyin ya da bize yazın' },
        { path: PUBLIC_PATHS.about, meta: PUBLIC_ABOUT_PAGE_META, h1: 'Küçük klinik için, pilot klinikle birlikte' }
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
    }

    it('/pricing eski adresi /paketler sayfasına yönlendirir', async () => {
        await harness.navigateByUrl('/pricing');

        expect(TestBed.inject(Router).url).toBe(PUBLIC_PATHS.packages);
    });

    it('özellikler: altı bölüm, her birinde ekran görüntüsü yer tutucusu', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.features);
        harness.detectChanges();

        expect(texts('section[id] h2')).toEqual(PUBLIC_FEATURE_SECTIONS.map((s) => s.title));
        expect(root().querySelectorAll('figure[role="img"]').length).toBe(PUBLIC_FEATURE_SECTIONS.length);
        expect(root().querySelector('figure[role="img"]')?.getAttribute('aria-label')).toContain('Ekran görüntüsü gelecek');
    });

    it('defterler: tablo tüm defterleri listeler; "mevzuata uygun" ve "KVKK uyumlu" yazmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.registersAndKvkk);
        harness.detectChanges();

        expect(texts('tbody th')).toEqual(PUBLIC_REGISTERS.map((r) => r.name));
        const body = root().textContent ?? '';

        expect(body).not.toContain('mevzuata uygun');
        expect(body).not.toContain('KVKK uyumlu');
    });

    it('paketler: tek pilot kartı, teklif bağlantısı iletişime gider; kullanıcı/klinik sınırı ve "Fiyat yakında" yazmaz', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.packages);
        harness.detectChanges();

        const card = root().querySelector('article');
        const body = root().textContent ?? '';

        expect(text('article h2')).toBe('Pilot dönemi');
        expect(card?.querySelector(`a[href="${PUBLIC_PATHS.contact}"]`)?.textContent?.trim()).toBe('Teklif al / yazın');
        expect(card?.querySelector('a[href="/auth/signup"]')).not.toBeNull();
        expect(body).toContain('Pilot dönemi fiyatı için yazın');
        expect(body).not.toContain('Fiyat yakında');
        expect(body).not.toMatch(/\d+ kullanıcı/);
        expect(body).not.toMatch(/\d+ klinik/);
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

    it('iletişim: e-posta kararı (AK-6) gelmeden mailto düğmesi yok, yer tutucular açıkça işaretli', async () => {
        await harness.navigateByUrl(PUBLIC_PATHS.contact);
        harness.detectChanges();

        expect(root().querySelector('a[href^="mailto:"]')).toBeNull();
        expect(root().querySelectorAll('.public-pending-placeholder').length).toBeGreaterThan(0);
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

    it('bölümler sırayla: kime göre, akış, Türkiye, güvenlik, geçiş, yol haritası, SSS, çağrı', () => {
        expect(texts('main section h2')).toEqual([
            'Kime göre?',
            'Bir günün akışı',
            "Türkiye'ye özgü",
            'Kayıtlarınız güvende ve dürüst',
            'Eski programdan geçiş yarım gün',
            'Yol haritasında',
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
        expect(hero.querySelector('figure[role="img"]')).not.toBeNull();
    });

    it('kime göre: üç kart, hastane yok', () => {
        expect(texts('section[aria-labelledby="public-home-audience-title"] h3')).toEqual(PUBLIC_HOME_AUDIENCE.map((a) => a.title));
        expect(root().textContent).not.toMatch(/hastane/i);
    });

    it('günün akışı: dört sekme; sekme değişince ekran etiketi değişir', () => {
        const tabs = root().querySelectorAll<HTMLButtonElement>('[aria-label="Günün adımları"] [role="tab"]');

        expect(Array.from(tabs).map((t) => t.querySelectorAll('span')[1].textContent?.trim())).toEqual(PUBLIC_HOME_DAY_FLOW.map((s) => s.title));
        expect(root().querySelector('[id^="flow-panel-"] figure')?.getAttribute('aria-label')).toContain(PUBLIC_HOME_DAY_FLOW[0].screenshot);

        tabs[2].click();
        harness.detectChanges();

        expect(tabs[2].getAttribute('aria-selected')).toBe('true');
        expect(root().querySelector('[id^="flow-panel-"] figure')?.getAttribute('aria-label')).toContain(PUBLIC_HOME_DAY_FLOW[2].screenshot);
    });

    it('yol haritası: dört "yakında" çipi; SMS, e-Fatura, mobil uygulama yalnız yakında olarak geçer', () => {
        const chips = texts('.public-chip-soon');

        expect(chips.length).toBe(PUBLIC_HOME_ROADMAP.length);
        chips.forEach((c) => expect(c).toContain('Yakında'));
        const body = root().textContent ?? '';

        expect(body).not.toContain('mevzuata uygun');
        expect(body).not.toContain('KVKK uyumlu');
        expect(body).not.toContain('Türkiye veri merkezi');
    });

    it('SSS: 6–8 soru, tek kaynaktan; fiyat yanıtı "pilot dönemi fiyatı için yazın"', () => {
        const questions = texts('section[aria-labelledby="public-home-faq-title"] h3');

        expect(questions).toEqual(PUBLIC_HOME_FAQS.map((f) => f.question));
        expect(PUBLIC_HOME_FAQS.find((f) => f.question === 'Fiyat ne kadar?')?.answer).toContain('pilot dönemi fiyatı için');
    });
});
