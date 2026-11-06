import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
    decidedFeatureRows,
    formatPlanPrice,
    formatUserLimit,
    planHighlights,
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
    type PricingFeatureRowDef
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
        expect(planHighlights('basic')).toEqual(['Destek: E-posta']);
        expect(planHighlights('pro')).toContain('Hasta sahibi portalı');
        expect(planHighlights('premium')).toContain('Çok klinik yönetimi ve klinikler arası yetki');
    });

    it('özellik tablosu: gruplar sırayla, satır adı tekil; hücreler ADR-035 (fark yalnız portal, çok klinik, destek)', () => {
        const groups = [...new Set(PRICING_FEATURE_ROWS.map((r) => r.group))];
        const labels = PRICING_FEATURE_ROWS.map((r) => r.label);

        expect(groups).toEqual(['Klinik', 'Kayıt ve KVKK', 'Para ve stok', 'Hasta sahibi', 'Yönetim', 'Destek']);
        expect(new Set(labels).size).toBe(labels.length);
        expect(PRICING_FEATURE_ROWS.length).toBeGreaterThanOrEqual(25);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.basic === false).map((r) => r.label)).toEqual(['Hasta sahibi portalı', 'Portaldan randevu talebi', 'Çok klinik yönetimi ve klinikler arası yetki']);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.pro === false).map((r) => r.key)).toEqual(['multiClinic']);
        expect(PRICING_FEATURE_ROWS.filter((r) => r.plans.premium === false)).toEqual([]);
        expect(PRICING_FEATURE_ROWS.find((r) => r.label === 'Online randevu talebi')?.plans).toEqual({ basic: true, pro: true, premium: true });
    });

    it('özellik tablosu ve "Şu an yok": söylenmeyecek iddia yok (ADR-034 karar 6); online randevu artık "yok" listesinde değil', () => {
        const text = PRICING_FEATURE_ROWS.map((r) => `${r.label} ${r.detail ?? ''}`).join(' ');

        expect(text).not.toMatch(/mevzuata uygun|KVKK uyumlu|SMS|e-?fatura|mobil uygulama|mağaza|veri merkezi|push|anlık bildirim|yalnızca bizde|en iyi|müşteri sayısı/i);
        expect(PRICING_NOT_AVAILABLE).not.toContain('Online randevu');
        expect(PRICING_NOT_AVAILABLE).toContain('Online ödeme');
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

    it('öne çıkanlar: pakette olup her pakette olmayan satırlar; karar verilmemiş satır yok sayılır', () => {
        expect(planHighlights('basic', SAMPLE_ROWS)).toEqual([]);
        expect(planHighlights('pro', SAMPLE_ROWS)).toEqual(['Yatış takibi']);
        expect(decidedFeatureRows(SAMPLE_ROWS).map((r) => r.label)).not.toContain('Karar verilmemiş satır');
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
    beforeEach(() => TestBed.configureTestingModule({ imports: [PublicPlanComparisonComponent] }));

    const render = (pricing: PricingCatalogState, rows: readonly PricingFeatureRowDef[] = SAMPLE_ROWS): HTMLElement => {
        const fixture = TestBed.createComponent(PublicPlanComparisonComponent);

        fixture.componentRef.setInput('pricing', pricing);
        fixture.componentRef.setInput('featureRows', rows);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('gösterilecek satır yoksa tablo çizilmez', () => {
        expect(render({ status: 'error' }, []).querySelector('table')).toBeNull();
    });

    it('katalog yokken yalnız özellik satırları (Fiyat ve Sınırlar grubu yok)', () => {
        const el = render({ status: 'error' });

        expect(Array.from(el.querySelectorAll('th[scope="colgroup"]')).map((th) => th.textContent?.trim())).toEqual(['Günlük iş', 'Yönetim']);
        expect(el.textContent).not.toContain('₺');
    });

    it('katalog gelince: aylık ve yıllık fiyat, kullanıcı sınırı; klinik satırı yok; Var/Yok ekran okuyucu metni', () => {
        const el = render(READY);
        const cells = (label: string): string[] => Array.from(Array.from(el.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th')?.textContent?.trim() === label)!.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');

        expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['Özellik', ...PRICING_PLAN_DEFS.map((p) => p.title)]);
        expect(Array.from(el.querySelectorAll('th[scope="colgroup"]')).map((th) => th.textContent?.trim())).toEqual(['Fiyat', 'Sınırlar', 'Günlük iş', 'Yönetim']);
        expect(cells('Aylık (KDV hariç)')).toEqual(['₺500', '₺1.000', PRICING_ON_REQUEST_TEXT]);
        expect(cells('Yıllık (10 ay ücreti, KDV hariç)')).toEqual(['₺5.000', '₺10.000', PRICING_ON_REQUEST_TEXT]);
        expect(cells('Kullanıcı')).toEqual(['2 kullanıcı', '8 kullanıcı', '40 kullanıcı']);
        expect(el.textContent).not.toMatch(/klinik/i);
        expect(cells('Yatış takibi')).toEqual(['Yok', 'Var', 'Var']);
        expect(cells('Hatırlatma')).toEqual(['E-posta', 'E-posta', 'E-posta']);
        expect(el.textContent).not.toContain('Karar verilmemiş satır');
    });

    it('uzun tabloda paket adları ilk grup dışındaki grup satırlarında tekrar eder; ekran okuyucudan gizli', () => {
        const repeats = Array.from(render(READY).querySelectorAll('td[data-plan-repeat]'));
        const titles = PRICING_PLAN_DEFS.map((p) => p.title);

        expect(repeats.map((td) => td.textContent?.trim())).toEqual([...titles, ...titles, ...titles]);
        repeats.forEach((td) => expect(td.getAttribute('aria-hidden')).toBe('true'));
    });
});
