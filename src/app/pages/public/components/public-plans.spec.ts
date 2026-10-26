import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
    decidedFeatureRows,
    formatPlanLimit,
    formatPlanPrice,
    hasPlanComparison,
    planHighlights,
    planPriceView,
    pricingSummaryText,
    pricingTermsText,
    PRICING_PLAN_DEFS,
    yearlyPriceTry,
    type PricingFeatureRowDef,
    type PricingPlanDef
} from '@/app/features/public/utils/pricing-plan.utils';
import { subscriptionPlanLabel, subscriptionPlanLimitLabels } from '@/app/features/subscriptions/utils/subscription-plan.utils';
import { PublicPlanCardsComponent } from './public-plan-cards.component';
import { PublicPlanComparisonComponent } from './public-plan-comparison.component';

/** Örnek veri: bileşenlerin farklı veriyle de doğru çizildiğini sınar; ürün kararı değildir. */
const SAMPLE_PLANS: readonly PricingPlanDef[] = PRICING_PLAN_DEFS.map((def, i) => ({
    ...def,
    monthlyPriceTry: [500, 1000, null][i],
    priceOnRequest: i === 2,
    maxUsers: [2, 8, 'sinirsiz' as const][i],
    maxClinics: [1, 2, 'coklu' as const][i],
    recommended: i === 1
}));

/** Undecided (veri girilmemiş) paketler: alanlar sayfada hiç çıkmaz. */
const EMPTY_PLANS: readonly PricingPlanDef[] = PRICING_PLAN_DEFS.map((def) => ({
    ...def,
    monthlyPriceTry: null,
    priceOnRequest: false,
    maxUsers: null,
    maxClinics: null,
    recommended: false
}));

const SAMPLE_ROWS: readonly PricingFeatureRowDef[] = [
    { group: 'Günlük iş', label: 'Yatış takibi', plans: { basic: false, pro: true, premium: true } },
    { group: 'Yönetim', label: 'Roller, izinler ve denetim izi', plans: { basic: true, pro: true, premium: true } },
    { group: 'Yönetim', label: 'Hatırlatma', plans: { basic: 'E-posta', pro: 'E-posta', premium: 'E-posta' } },
    { group: 'Yönetim', label: 'Karar verilmemiş satır', plans: { basic: null, pro: null, premium: null } }
];

describe('Paket verisi (pricing-plan.utils)', () => {
    it('ADR-035 tablosu: aylık fiyat (KDV hariç, yıllık ödeme ve indirim yok), sınırlar ve kademe farkları', () => {
        const [temel, profesyonel, kurumsal] = PRICING_PLAN_DEFS;

        expect(PRICING_PLAN_DEFS.map((p) => p.title)).toEqual(['Temel', 'Profesyonel', 'Kurumsal']);
        expect([temel.monthlyPriceTry, temel.maxClinics, temel.maxUsers]).toEqual([999, 1, 3]);
        expect([profesyonel.monthlyPriceTry, profesyonel.maxClinics, profesyonel.maxUsers]).toEqual([1990, 1, 10]);
        expect([kurumsal.priceOnRequest, kurumsal.monthlyPriceTry, kurumsal.maxClinics, kurumsal.maxUsers]).toEqual([true, null, 'coklu', 'sinirsiz']);
        expect(pricingTermsText()).toBe('Fiyatlar KDV hariç');
        expect(pricingSummaryText()).toBe('Temel aylık ₺999, Profesyonel aylık ₺1.990; Kurumsal için bize ulaşın');
        expect(planHighlights('basic')).toEqual(['Destek: E-posta']);
        expect(planHighlights('pro')).toContain('Hasta sahibi portalı');
        expect(planHighlights('pro')).not.toContain('Çok klinik yönetimi ve klinikler arası yetki');
        expect(planHighlights('premium')).toContain('Çok klinik yönetimi ve klinikler arası yetki');
        expect(hasPlanComparison()).toBe(true);
    });

    it('fiyat görünümü: aylık birim; teklifli pakette "İletişime geçin"', () => {
        expect(planPriceView(PRICING_PLAN_DEFS[0])).toEqual({ amount: '₺999', unit: '/ ay', note: null });
        expect(planPriceView(PRICING_PLAN_DEFS[1])).toEqual({ amount: '₺1.990', unit: '/ ay', note: null });
        expect(planPriceView(PRICING_PLAN_DEFS[2])).toEqual({ amount: 'İletişime geçin', unit: null, note: null });
        expect(planPriceView(EMPTY_PLANS[0])).toBeNull();
        expect(hasPlanComparison(EMPTY_PLANS, [])).toBe(false);
    });

    it('yıllık fiyat (BILL-001): 10 aylık tutar, "2 ay hediye" ve aylık karşılığı; teklifli pakette yine "İletişime geçin"', () => {
        expect(yearlyPriceTry(PRICING_PLAN_DEFS[0])).toBe(9990);
        expect(yearlyPriceTry(PRICING_PLAN_DEFS[2])).toBeNull();
        expect(planPriceView(PRICING_PLAN_DEFS[0], 'yearly')).toEqual({ amount: '₺9.990', unit: '/ yıl', note: "2 ay hediye · aylık ₺833'e denk" });
        expect(planPriceView(PRICING_PLAN_DEFS[1], 'yearly')).toEqual({ amount: '₺19.900', unit: '/ yıl', note: "2 ay hediye · aylık ₺1.658'e denk" });
        expect(planPriceView(PRICING_PLAN_DEFS[2], 'yearly')).toEqual({ amount: 'İletişime geçin', unit: null, note: null });
    });

    it('biçimlendirme: TL tutar, sınır etiketi; null → null', () => {
        expect(formatPlanPrice(1990)).toBe('₺1.990');
        expect(formatPlanPrice(null)).toBeNull();
        expect(formatPlanLimit(10, 'kullanıcı')).toBe('10 kullanıcı');
        expect(formatPlanLimit('sinirsiz', 'kullanıcı')).toBe('Sınırsız kullanıcı');
        expect(formatPlanLimit('coklu', 'klinik')).toBe('Çok klinik');
        expect(formatPlanLimit(null, 'klinik')).toBeNull();
    });

    it('öne çıkanlar: pakette olup her pakette olmayan satırlar; karar verilmemiş satır yok sayılır', () => {
        expect(planHighlights('basic', SAMPLE_ROWS)).toEqual([]);
        expect(planHighlights('pro', SAMPLE_ROWS)).toEqual(['Yatış takibi']);
        expect(decidedFeatureRows(SAMPLE_ROWS).map((r) => r.label)).not.toContain('Karar verilmemiş satır');
        expect(hasPlanComparison(SAMPLE_PLANS, [])).toBe(true);
    });

    it('panel abonelik kartı: paket adı ve sınır etiketleri aynı veriden', () => {
        expect(subscriptionPlanLabel('Pro', null)).toBe('Profesyonel');
        expect(subscriptionPlanLabel('Premium', null)).toBe('Kurumsal');
        expect(subscriptionPlanLimitLabels('Basic')).toEqual({ userLimitLabel: '3 kullanıcı', clinicLimitLabel: '1 klinik' });
        expect(subscriptionPlanLimitLabels('Premium')).toEqual({ userLimitLabel: 'Sınırsız kullanıcı', clinicLimitLabel: 'Çok klinik' });
    });
});

describe('PublicPlanCardsComponent', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [PublicPlanCardsComponent], providers: [provideRouter([])] }));

    it('veri girilmemişse: başlık, açıklama, deneme bağlantısı; fiyat ve sınır satırı yok', () => {
        const fixture = TestBed.createComponent(PublicPlanCardsComponent);

        fixture.componentRef.setInput('plans', EMPTY_PLANS);
        fixture.componentRef.setInput('featureRows', []);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(Array.from(el.querySelectorAll('[data-plan] h3')).map((h) => h.textContent?.trim())).toEqual(PRICING_PLAN_DEFS.map((p) => p.title));
        expect(el.textContent).not.toContain('/ ay');
        expect(el.querySelector('.public-plan-badge')).toBeNull();
        expect(el.querySelector('[data-plan="pro"] a')?.getAttribute('href')).toBe('/auth/signup?plan=pro');
    });

    it('veri gelince: fiyat, not, sınırlar, öne çıkanlar ve "Önerilen" etiketi', () => {
        const fixture = TestBed.createComponent(PublicPlanCardsComponent);

        fixture.componentRef.setInput('plans', SAMPLE_PLANS);
        fixture.componentRef.setInput('featureRows', SAMPLE_ROWS);
        fixture.detectChanges();
        const pro = (fixture.nativeElement as HTMLElement).querySelector('[data-plan="pro"]')!;

        expect(pro.textContent).toContain('₺1.000');
        expect(pro.textContent).toContain('/ ay');
        expect(pro.textContent).toContain('KDV hariç');
        expect(pro.textContent).toContain('8 kullanıcı');
        expect(pro.textContent).toContain('2 klinik');
        expect(pro.textContent).toContain('Yatış takibi');
        expect(pro.querySelector('.public-plan-badge')?.textContent?.trim()).toBe('Önerilen');
        expect(pro.querySelector('a.public-btn-primary')).not.toBeNull();
        expect(pro.textContent).not.toMatch(/\/ yıl|hediye/);
        const premium = (fixture.nativeElement as HTMLElement).querySelector('[data-plan="premium"]')!;

        expect(premium.textContent).toContain('İletişime geçin');
        expect(premium.textContent).toContain('Çok klinik');
    });
});

describe('PublicPlanComparisonComponent', () => {
    beforeEach(() => TestBed.configureTestingModule({ imports: [PublicPlanComparisonComponent] }));

    it('veri girilmemişse tablo çizilmez', () => {
        const fixture = TestBed.createComponent(PublicPlanComparisonComponent);

        fixture.componentRef.setInput('plans', EMPTY_PLANS);
        fixture.componentRef.setInput('featureRows', []);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
    });

    it('veri gelince: paket sütunları, Sınırlar grubu, doldurulmuş satırlar; Var/Yok ekran okuyucu metni', () => {
        const fixture = TestBed.createComponent(PublicPlanComparisonComponent);

        fixture.componentRef.setInput('plans', SAMPLE_PLANS);
        fixture.componentRef.setInput('featureRows', SAMPLE_ROWS);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const cells = (label: string): string[] => Array.from(Array.from(el.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th')?.textContent?.trim() === label)!.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');

        expect(Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['Özellik', ...PRICING_PLAN_DEFS.map((p) => p.title)]);
        expect(Array.from(el.querySelectorAll('th[scope="colgroup"]')).map((th) => th.textContent?.trim())).toEqual(['Fiyat', 'Sınırlar', 'Günlük iş', 'Yönetim']);
        expect(cells('Aylık (KDV hariç)')).toEqual(['₺500', '₺1.000', 'İletişime geçin']);
        expect(el.textContent).not.toContain('Yıllık');
        expect(cells('Kullanıcı')).toEqual(['2 kullanıcı', '8 kullanıcı', 'Sınırsız kullanıcı']);
        expect(cells('Klinik')).toEqual(['1 klinik', '2 klinik', 'Çok klinik']);
        expect(cells('Yatış takibi')).toEqual(['Yok', 'Var', 'Var']);
        expect(cells('Hatırlatma')).toEqual(['E-posta', 'E-posta', 'E-posta']);
        expect(el.textContent).not.toContain('Karar verilmemiş satır');
    });
});
