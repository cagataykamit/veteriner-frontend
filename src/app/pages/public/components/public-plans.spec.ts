import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
    decidedFeatureRows,
    formatPlanPrice,
    formatUserLimit,
    isPlanDifferenceRow,
    planAvailabilityText,
    planCardFeatures,
    planOffer,
    planPriceView,
    planTitlesText,
    planTitlesWithFeature,
    priceMinorToTry,
    pricingTermsText,
    PRICING_FEATURE_ROWS,
    PRICING_NOT_AVAILABLE,
    PRICING_ON_REQUEST_TEXT,
    PRICING_PLAN_DEFS,
    type PricingCatalog,
    type PricingCatalogState,
    type PricingFeatureRowDef,
    type PricingPlanDef
} from '@/app/entities/subscription/utils/pricing-plan.utils';
import { subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';
import { PublicPlanCardsComponent } from './public-plan-cards.component';
import { PublicPlanComparisonComponent } from './public-plan-comparison.component';

/** Örnek katalog: bileşenlerin backend verisiyle çizildiğini sınar; ürün fiyatı değildir (fiyat backend'de, WEB-007). */
const SAMPLE_CATALOG: PricingCatalog = {
    vatIncluded: false,
    yearlyBilledMonths: 10,
    plans: [
        { apiCode: 'Basic', maxUsers: 2, monthlyPriceTry: 500, yearlyPriceTry: 5000 },
        { apiCode: 'Pro', maxUsers: 8, monthlyPriceTry: 1000, yearlyPriceTry: 10000 },
        { apiCode: 'Premium', maxUsers: 40, monthlyPriceTry: null, yearlyPriceTry: null }
    ]
};

const READY: PricingCatalogState = { status: 'ready', catalog: SAMPLE_CATALOG };

const SAMPLE_ROWS: readonly PricingFeatureRowDef[] = [
    { group: 'Günlük iş', label: 'Yatış takibi', plans: { basic: false, pro: true, premium: true } },
    { group: 'Yönetim', label: 'Roller, izinler ve denetim izi', plans: { basic: true, pro: true, premium: true } },
    { group: 'Yönetim', label: 'Hatırlatma', plans: { basic: 'E-posta', pro: 'E-posta', premium: 'E-posta' } },
    { group: 'Yönetim', label: 'Karar verilmemiş satır', plans: { basic: null, pro: null, premium: null } }
];

describe('Paket verisi (pricing-plan.utils)', () => {
    it('paket metni ADR-035; sayı yok (fiyat, yıllık kural ve sınır backend kataloğundan, WEB-007)', () => {
        expect(PRICING_PLAN_DEFS.map((p) => p.title)).toEqual(['Temel', 'Profesyonel', 'Kurumsal']);
        PRICING_PLAN_DEFS.forEach((p) => expect(Object.keys(p).filter((k) => /price|max/i.test(k))).toEqual([]));
        expect(pricingTermsText()).toBe('Fiyatlar KDV hariç');
        expect(planTitlesText()).toBe('Temel, Profesyonel ve Kurumsal');
        expect(planTitlesWithFeature('multiClinic')).toBe('Kurumsal');
    });

    it('kartlar (TIER-023): Temel alan alan sayar; üst paketler yalnız bir öncekinden farkı sayar, metin özellik tablosundan', () => {
        const labels = (slug: 'basic' | 'pro' | 'premium') => planCardFeatures(slug).items.map((i) => i.label);
        const basicIn = (group: string) => PRICING_FEATURE_ROWS.filter((r) => r.group === group && r.plans.basic === true).length;

        expect(planCardFeatures('basic').lead).toBe('Kapsam:');
        expect(labels('basic')).toContain(`Klinik: ${basicIn('Klinik')} özellik`);
        expect(labels('basic')).toContain(`Kayıt ve KVKK: ${basicIn('Kayıt ve KVKK')} özellik`);
        expect(labels('basic')).toContain('Destek: E-posta');

        expect(planCardFeatures('pro').lead).toBe("Temel'deki her şey, artı:");
        expect(labels('pro')).toContain('Hasta sahibi portalı');
        expect(labels('pro')).toContain('Destek: E-posta, öncelikli');
        expect(labels('pro')).not.toContain('Bugün ekranı ve geliş takibi');
        expect(labels('pro')).not.toContain('Çok klinik yönetimi ve klinikler arası yetki');

        expect(planCardFeatures('premium').lead).toBe("Profesyonel'deki her şey, artı:");
        expect(labels('premium')).toEqual([
            'Şubeler özeti',
            'Çok klinik yönetimi ve klinikler arası yetki',
            'API erişimi',
            'Destek: Özel iletişim, kurulum desteği',
            'Ücretsiz geçiş desteği',
            'Size özel geliştirmeler'
        ]);
    });

    it('kimin için: her paketin kısa açıklaması var', () => {
        expect(PRICING_PLAN_DEFS.map((p) => p.description)).toEqual([
            'Tek hekimli ya da küçük ekipli, tek şubeli klinik',
            'Büyüyen, birkaç kullanıcılı ve hasta portalı kullanan klinik',
            'Birden fazla şubesi olan işletme'
        ]);
    });

    it('özellik tablosu: gruplar sırayla, satır adı tekil; hücreler ADR-035 ve 2026-11-09 dağılımı', () => {
        const groups = [...new Set(PRICING_FEATURE_ROWS.map((r) => r.group))];
        const labels = PRICING_FEATURE_ROWS.map((r) => r.label);
        const keys = PRICING_FEATURE_ROWS.flatMap((r) => (r.key ? [r.key] : []));
        const plansOf = (key: string) => PRICING_FEATURE_ROWS.find((r) => r.key === key)?.plans;

        expect(groups).toEqual(['Klinik', 'Kayıt ve KVKK', 'Para ve stok', 'Web sitesi ve randevu', 'Hasta sahibi', 'Yönetim', 'Destek']);
        expect(new Set(labels).size).toBe(labels.length);
        expect(new Set(keys).size).toBe(keys.length);
        expect(PRICING_FEATURE_ROWS.length).toBeGreaterThanOrEqual(25);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.basic === false).map((r) => r.label)).toEqual([
            'Bekleme listesi',
            'Otomatik aşı sihirbazı',
            'Çoklu kasa ve kasa yönetimi',
            'Kamerayla barkod okutma',
            'Otomatik hatırlatıcılar',
            'Hasta sahibi portalı',
            'Portaldan randevu talebi',
            'Gelişmiş raporlar',
            'Şubeler özeti',
            'Çok klinik yönetimi ve klinikler arası yetki',
            'API erişimi',
            'Ücretsiz geçiş desteği',
            'Size özel geliştirmeler'
        ]);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.pro === false).map((r) => r.label)).toEqual([
            'Şubeler özeti',
            'Çok klinik yönetimi ve klinikler arası yetki',
            'API erişimi',
            'Ücretsiz geçiş desteği',
            'Size özel geliştirmeler'
        ]);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.premium === false)).toEqual([]);

        for (const key of ['clinicSite', 'vetFinder', 'onlineBooking', 'reminderReplies', 'dataExport']) {
            expect(plansOf(key), key).toEqual({ basic: true, pro: true, premium: true });
        }
    });

    it('paket etiketi satırdan: tüm paketler, Profesyonel ve üstü, yalnız Kurumsal', () => {
        expect(planAvailabilityText('clinicSite')).toBe('Tüm paketlerde');
        expect(planAvailabilityText('cashManagement')).toBe('Profesyonel ve Kurumsal paketlerinde');
        expect(planAvailabilityText('clinicsOverview')).toBe('Kurumsal paketinde');
        expect(planTitlesWithFeature('freeMigrationSupport')).toBe('Kurumsal');
        expect(planAvailabilityText('clinicSite', SAMPLE_ROWS)).toBe('');
    });

    it('özellik tablosu ve "Şu an yok": söylenmeyecek iddia yok (ADR-034 karar 6); online randevu artık "yok" listesinde değil', () => {
        const text = PRICING_FEATURE_ROWS.map((r) => `${r.label} ${r.detail ?? ''}`).join(' ');

        expect(text).not.toMatch(/mevzuata uygun|KVKK uyumlu|SMS|e-?fatura|mobil uygulama|mağaza|veri merkezi|push|anlık bildirim|yalnızca bizde|en iyi|müşteri sayısı/i);
        expect(PRICING_NOT_AVAILABLE).not.toContain('Online randevu');
        expect(PRICING_NOT_AVAILABLE).toContain('Online ödeme');
        expect(PRICING_NOT_AVAILABLE.join(' ')).toMatch(/e-Fatura/);
        expect(PRICING_NOT_AVAILABLE.join(' ')).toMatch(/HBS'e otomatik gönderim/);
        expect(PRICING_NOT_AVAILABLE.join(' ')).toMatch(/Yapay zekâ/);
        expect(PRICING_NOT_AVAILABLE.join(' ')).not.toMatch(/mağaza/i);
    });

    it('katalogdan paket: kod büyük/küçük harf duyarsız; katalog yükleniyorsa ya da alınamadıysa yok', () => {
        expect(planOffer(READY, PRICING_PLAN_DEFS[1])?.maxUsers).toBe(8);
        expect(planOffer({ status: 'ready', catalog: { ...SAMPLE_CATALOG, plans: [{ ...SAMPLE_CATALOG.plans[0], apiCode: 'basic' }] } }, PRICING_PLAN_DEFS[0])?.monthlyPriceTry).toBe(500);
        expect(planOffer({ status: 'loading' }, PRICING_PLAN_DEFS[0])).toBeNull();
        expect(planOffer({ status: 'error' }, PRICING_PLAN_DEFS[0])).toBeNull();
    });

    it('fiyat görünümü: aylık birim; yıllıkta katalogdaki yıllık tutar, hediye ay ve aylık ortalama; fiyat yoksa null', () => {
        const [basic, , premium] = SAMPLE_CATALOG.plans;

        expect(planPriceView(basic, SAMPLE_CATALOG)).toEqual({ amount: '₺500', unit: '/ ay', note: null });
        expect(planPriceView(basic, SAMPLE_CATALOG, 'yearly')).toEqual({ amount: '₺5.000', unit: '/ yıl', note: '2 ay hediye · aylık ortalama ₺417' });
        expect(planPriceView(basic, { ...SAMPLE_CATALOG, yearlyBilledMonths: 12 }, 'yearly')?.note).toBe('aylık ortalama ₺417');
        expect(planPriceView(premium, SAMPLE_CATALOG)).toBeNull();
        expect(planPriceView(null, SAMPLE_CATALOG)).toBeNull();
        expect(planPriceView(basic, null)).toBeNull();
    });

    it('biçimlendirme: kuruş → TL, TL tutar, kullanıcı sınırı; geçersiz → null', () => {
        expect(priceMinorToTry(179000)).toBe(1790);
        expect(priceMinorToTry(0)).toBeNull();
        expect(priceMinorToTry(null)).toBeNull();
        expect(formatPlanPrice(1790)).toBe('₺1.790');
        expect(formatPlanPrice(null)).toBeNull();
        expect(formatUserLimit(15)).toBe('15 kullanıcı');
        expect(formatUserLimit(null)).toBeNull();
    });

    it('kart maddeleri: ilk paket alan sayısı ve metin hücresi; sonraki paket yalnız farkı; karar verilmemiş satır yok sayılır', () => {
        expect(planCardFeatures('basic', SAMPLE_ROWS)).toEqual({ lead: 'Kapsam:', items: [{ label: 'Yönetim: 1 özellik' }, { label: 'Hatırlatma: E-posta', badge: undefined }] });
        expect(planCardFeatures('pro', SAMPLE_ROWS)).toEqual({ lead: "Temel'deki her şey, artı:", items: [{ label: 'Yatış takibi', badge: undefined }] });
        expect(planCardFeatures('premium', SAMPLE_ROWS)).toEqual({ lead: "Profesyonel'deki her şey, artı:", items: [] });
        expect(decidedFeatureRows(SAMPLE_ROWS).map((r) => r.label)).not.toContain('Karar verilmemiş satır');
        expect(SAMPLE_ROWS.map(isPlanDifferenceRow)).toEqual([true, false, false, false]);
    });

    it('satır etiketi (ör. ileride "Eklenti gerekir") karta taşınır', () => {
        const rows: readonly PricingFeatureRowDef[] = [{ group: 'Yönetim', label: 'Örnek eklenti', badge: 'Eklenti gerekir', plans: { basic: false, pro: true, premium: true } }];

        expect(planCardFeatures('pro', rows).items).toEqual([{ label: 'Örnek eklenti', badge: 'Eklenti gerekir' }]);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.badge)).toEqual([]);
    });

    it('panel abonelik kartı: paket adı aynı veriden', () => {
        expect(subscriptionPlanLabel('Pro', null)).toBe('Profesyonel');
        expect(subscriptionPlanLabel('Premium', null)).toBe('Kurumsal');
    });
});

describe('PublicPlanCardsComponent', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [PublicPlanCardsComponent], providers: [provideRouter([])] }));

    const render = (pricing: PricingCatalogState, periodToggle = false) => {
        const fixture = TestBed.createComponent(PublicPlanCardsComponent);

        fixture.componentRef.setInput('pricing', pricing);
        fixture.componentRef.setInput('featureRows', SAMPLE_ROWS);
        fixture.componentRef.setInput('periodToggle', periodToggle);
        fixture.detectChanges();

        return fixture;
    };

    it('katalog yüklenirken: başlık, açıklama, deneme bağlantısı ve yer tutucu; tutar, sınır ve anahtar yok', () => {
        const el = render({ status: 'loading' }, true).nativeElement as HTMLElement;

        expect(Array.from(el.querySelectorAll('[data-plan] h3')).map((h) => h.textContent?.trim())).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));
        expect(el.querySelectorAll('[data-price-loading]').length).toBe(3);
        expect(el.textContent).not.toContain('₺');
        expect(el.textContent).not.toMatch(/\d+ kullanıcı/);
        expect(el.querySelector('[aria-label="Ödeme dönemi"]')).toBeNull();
        expect(el.querySelector('[data-plan="pro"] a.public-btn')?.getAttribute('href')).toBe('/auth/signup?plan=pro');
    });

    it('katalog alınamazsa: her kartta "Fiyat için bize yazın" (iletişim), sabit sayı yok; deneme düğmesi kalır', () => {
        const el = render({ status: 'error' }, true).nativeElement as HTMLElement;
        const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('[data-price-on-request]'));

        expect(links.map((a) => a.textContent?.trim())).toEqual([PRICING_ON_REQUEST_TEXT, PRICING_ON_REQUEST_TEXT, PRICING_ON_REQUEST_TEXT]);
        expect(links[0].getAttribute('href')).toBe('/iletisim');
        expect(el.textContent).not.toContain('₺');
        expect(el.textContent).not.toMatch(/\d+ kullanıcı/);
        expect(el.querySelectorAll('a.public-btn').length).toBe(3);
    });

    it('katalog gelince: fiyat, KDV notu, kullanıcı sınırı (klinik sınırı yok), öne çıkanlar ve "Önerilen" etiketi', () => {
        const el = render(READY).nativeElement as HTMLElement;
        const pro = el.querySelector('[data-plan="pro"]')!;

        expect(pro.textContent).toContain('₺1.000');
        expect(pro.textContent).toContain('/ ay');
        expect(pro.textContent).toContain('KDV hariç');
        expect(pro.textContent).toContain('8 kullanıcı');
        expect(pro.textContent).not.toMatch(/\d+ klinik/i);
        expect(pro.textContent).toContain('Yatış takibi');
        expect(pro.querySelector('[data-plan-lead]')?.textContent?.trim()).toBe("Temel'deki her şey, artı:");
        expect(pro.querySelector('[data-plan-audience]')?.textContent?.replace(/s+/g, ' ').trim()).toBe(`Kimin için: ${PRICING_PLAN_DEFS[1].description}`);
        expect(pro.querySelector('.public-plan-badge')?.textContent?.trim()).toBe('Önerilen');
        expect(pro.querySelector('a.public-btn-primary')).not.toBeNull();
        expect(pro.textContent).not.toMatch(/\/ yıl|hediye/);
        const premium = el.querySelector('[data-plan="premium"]')!;

        expect(premium.querySelector('[data-price-on-request]')?.textContent?.trim()).toBe(PRICING_ON_REQUEST_TEXT);
        expect(premium.textContent).toContain('40 kullanıcı');
    });

    it('Aylık/Yıllık anahtarı: hediye ay katalogdan, yıllıkta katalogdaki yıllık tutar', () => {
        const fixture = render(READY, true);
        const el = fixture.nativeElement as HTMLElement;
        const toggle = el.querySelector('[aria-label="Ödeme dönemi"]')!;

        expect(el.textContent).toContain('Yıllıkta 2 ay hediye');
        Array.from(toggle.querySelectorAll('button'))
            .find((b) => b.textContent?.trim() === 'Yıllık')!
            .click();
        fixture.detectChanges();

        const basic = el.querySelector('[data-plan="basic"]')!;

        expect(basic.textContent).toContain('₺5.000');
        expect(basic.textContent).toContain('/ yıl');
        expect(basic.textContent?.replace(/\s+/g, ' ')).toContain('2 ay hediye · aylık ortalama ₺417 · KDV hariç');
    });
});

describe('PublicPlanComparisonComponent', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [PublicPlanComparisonComponent], providers: [provideRouter([])] }));

    const render = (pricing: PricingCatalogState, rows: readonly PricingFeatureRowDef[] = SAMPLE_ROWS, plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): HTMLElement => {
        const fixture = TestBed.createComponent(PublicPlanComparisonComponent);

        fixture.componentRef.setInput('pricing', pricing);
        fixture.componentRef.setInput('featureRows', rows);
        fixture.componentRef.setInput('plans', plans);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    /** `thead`'in paket sütunları, paket sırasıyla. */
    const planHeads = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>('thead th')).slice(1);
    const texts = (el: HTMLElement, selector: string): string[] => Array.from(el.querySelectorAll(selector)).map((n) => n.textContent?.trim() ?? '');
    const rowCells = (el: HTMLElement, label: string): HTMLElement[] => Array.from(Array.from(el.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th')?.textContent?.trim() === label)!.querySelectorAll('td'));

    it('gösterilecek satır yoksa katalog hazır olsa da hiçbir şey çizilmez', () => {
        const undecided = SAMPLE_ROWS.filter((r) => r.plans.basic === null);

        for (const state of [{ status: 'loading' }, { status: 'error' }, READY] as const) {
            expect(render(state, []).querySelector('*')).toBeNull();
            expect(render(state, undecided).querySelector('*')).toBeNull();
        }
    });

    for (const state of [{ status: 'loading' }, { status: 'error' }] as const) {
        it(`katalog durumu ${state.status}: başlıkta yalnız paket adı; fiyat, KDV notu, kullanıcı ve iletişim bağlantısı çizilmez, özellik satırları kalır`, () => {
            const el = render(state);

            expect(planHeads(el).map((th) => th.textContent?.replace('Önerilen', '').trim())).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));
            expect(el.textContent).not.toContain('₺');
            expect(el.textContent).not.toContain('/ ay');
            expect(el.textContent).not.toContain('KDV');
            expect(el.textContent).not.toContain('kullanıcı');
            expect(el.textContent).not.toContain(PRICING_ON_REQUEST_TEXT);
            expect(el.querySelector('a')).toBeNull();
            expect(texts(el, '[data-group-title]')).toEqual(['Günlük iş', 'Yönetim']);
            expect(texts(el, 'tbody th[scope="row"]')).toEqual(['Yatış takibi', 'Roller, izinler ve denetim izi', 'Hatırlatma']);
        });
    }

    it('katalog gelince başlıkta aylık fiyat, KDV notu ve kullanıcı sınırı; yıllık fiyat ve klinik sınırı tabloda yok', () => {
        const el = render(READY);
        const [basic, pro] = planHeads(el);

        expect(basic.textContent).toContain('Temel');
        expect(basic.textContent).toContain('₺500');
        expect(basic.textContent).toContain('/ ay, KDV hariç');
        expect(basic.textContent).toContain('2 kullanıcı');
        expect(pro.textContent).toContain('₺1.000');
        expect(pro.textContent).toContain('8 kullanıcı');
        expect(el.textContent).not.toContain('₺5.000');
        expect(el.textContent).not.toMatch(/yıllık|\/ yıl/i);
        expect(el.textContent).not.toMatch(/klinik/i);
        expect(texts(el, '[data-group-title]')).toEqual(['Günlük iş', 'Yönetim']);
    });

    it('KDV notu katalogdan', () => {
        expect(planHeads(render({ status: 'ready', catalog: { ...SAMPLE_CATALOG, vatIncluded: true } }))[0].textContent).toContain('/ ay, KDV dahil');
    });

    it('fiyatı olmayan paket: "Fiyat için bize yazın" iletişime gider, tutar ve "/ ay" yok; kullanıcı sınırı kalır', () => {
        const premium = planHeads(render(READY))[2];
        const link = premium.querySelector('a');

        expect(link?.textContent?.trim()).toBe(PRICING_ON_REQUEST_TEXT);
        expect(link?.getAttribute('href')).toBe('/iletisim');
        expect(premium.textContent).not.toContain('₺');
        expect(premium.textContent).not.toContain('/ ay');
        expect(premium.textContent).toContain('40 kullanıcı');
    });

    it('katalogda olmayan paket: "Fiyat için bize yazın", kullanıcı sınırı uydurulmaz', () => {
        const pro = planHeads(render({ status: 'ready', catalog: { ...SAMPLE_CATALOG, plans: SAMPLE_CATALOG.plans.filter((p) => p.apiCode !== 'Pro') } }))[1];

        expect(pro.querySelector('a')?.textContent?.trim()).toBe(PRICING_ON_REQUEST_TEXT);
        expect(pro.textContent).not.toContain('kullanıcı');
    });

    it('"Önerilen" etiketi ve sütun vurgusu `recommended` alanından: başlıkta ve her özellik satırında aynı sütun', () => {
        const recommendedColumns = (el: HTMLElement): number[][] =>
            [planHeads(el), ...Array.from(el.querySelectorAll('tbody tr.public-plan-compare-row')).map((tr) => Array.from(tr.querySelectorAll('td')))].map((cells) => cells.flatMap((cell, i) => (cell.classList.contains('public-plan-compare-col--recommended') ? [i] : [])));
        const tags = (el: HTMLElement): (string | null)[] => planHeads(el).map((th) => th.querySelector('.public-plan-compare-tag')?.textContent?.trim() ?? null);

        const byData = render(READY);

        expect(tags(byData)).toEqual([null, 'Önerilen', null]);
        recommendedColumns(byData).forEach((columns) => expect(columns).toEqual([1]));

        const premiumRecommended = render(
            READY,
            SAMPLE_ROWS,
            PRICING_PLAN_DEFS.map((p) => ({ ...p, recommended: p.slug === 'premium' }))
        );

        expect(tags(premiumRecommended)).toEqual([null, null, 'Önerilen']);
        recommendedColumns(premiumRecommended).forEach((columns) => expect(columns).toEqual([2]));

        const none = render(
            READY,
            SAMPLE_ROWS,
            PRICING_PLAN_DEFS.map((p) => ({ ...p, recommended: false }))
        );

        expect(none.querySelector('.public-plan-compare-tag')).toBeNull();
        expect(none.querySelector('.public-plan-compare-col--recommended')).toBeNull();
    });

    it('alan bantları: sıra numarası ve karar verilmiş satır sayısı', () => {
        const el = render(READY);

        expect(texts(el, '.public-plan-compare-group-no')).toEqual(['1', '2']);
        expect(texts(el, '[data-group-count]')).toEqual(['1 özellik', '2 özellik']);
        expect(el.querySelector('.public-plan-compare-group-no')?.getAttribute('aria-hidden')).toBe('true');
        expect(el.querySelector('tbody th[scope="rowgroup"]')?.getAttribute('colspan')).toBe('4');
    });

    it('hücreler: var dolu daire, yok çizgi, ekran okuyucuya "Var"/"Yok"; metin hücresi metni gösterir; karar verilmemiş satır yok', () => {
        const el = render(READY);
        const [no, yes] = rowCells(el, 'Yatış takibi');

        expect(rowCells(el, 'Yatış takibi').map((td) => td.textContent?.trim())).toEqual(['Yok', 'Var', 'Var']);
        expect(no.querySelector('.public-plan-compare-no')?.getAttribute('aria-hidden')).toBe('true');
        expect(no.querySelector('.sr-only')?.textContent).toBe('Yok');
        expect(yes.querySelector('.public-plan-compare-yes')?.getAttribute('aria-hidden')).toBe('true');
        expect(yes.querySelector('.sr-only')?.textContent).toBe('Var');
        rowCells(el, 'Hatırlatma').forEach((td) => {
            expect(td.textContent?.trim()).toBe('E-posta');
            expect(td.querySelector('.public-plan-compare-yes, .public-plan-compare-no, .sr-only')).toBeNull();
        });
        expect(el.textContent).not.toContain('Karar verilmemiş satır');
    });

    it('"Sadece farkları göster": varsayılan kapalı; açılınca her pakette aynı satırlar ve boş kalan bant gizlenir', () => {
        const fixture = TestBed.createComponent(PublicPlanComparisonComponent);

        fixture.componentRef.setInput('pricing', READY);
        fixture.componentRef.setInput('featureRows', SAMPLE_ROWS);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const toggle = el.querySelector<HTMLInputElement>('[data-only-differences]')!;

        expect(toggle.checked).toBe(false);
        expect(toggle.getAttribute('role')).toBe('switch');
        expect(toggle.closest('label')?.textContent?.trim()).toBe('Sadece farkları göster');
        expect(texts(el, 'tbody th[scope="row"]')).toEqual(['Yatış takibi', 'Roller, izinler ve denetim izi', 'Hatırlatma']);

        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(texts(el, 'tbody th[scope="row"]')).toEqual(['Yatış takibi']);
        expect(texts(el, '[data-group-title]')).toEqual(['Günlük iş']);
        expect(texts(el, '[data-group-count]')).toEqual(['1 özellik']);
    });

    it('satır etiketi tabloda satır adının yanında', () => {
        const el = render(READY, [{ group: 'Yönetim', label: 'Örnek eklenti', badge: 'Eklenti gerekir', plans: { basic: false, pro: true, premium: true } }]);

        expect(el.querySelector('tbody th[scope="row"] [data-row-badge]')?.textContent?.trim()).toBe('Eklenti gerekir');
    });

    it('gerçek tablo: caption, sütun ve satır başlıkları', () => {
        const el = render(READY);

        expect(el.querySelector('table caption')?.textContent?.trim()).toBe('Paket karşılaştırması');
        expect(el.querySelectorAll('thead th[scope="col"]').length).toBe(PRICING_PLAN_DEFS.length + 1);
        expect(el.querySelector('thead th')?.textContent?.trim()).toBe('Özellik');
        expect(el.querySelectorAll('tbody th[scope="row"]').length).toBe(3);
    });
});
