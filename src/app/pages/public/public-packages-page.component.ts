import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import { PRICING_NOT_AVAILABLE, PRICING_PLAN_DEFS, pricingTermsText, type PricingBillingPeriod } from '@/app/features/public/utils/pricing-plan.utils';
import {
    PUBLIC_PACKAGES_PAGE_META,
    publicFaqPageJsonLd,
    publicPricingJsonLd,
    removePublicJsonLd,
    setPublicJsonLd,
    setPublicPageMeta
} from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicPlanCardsComponent } from './components/public-plan-cards.component';
import { PublicPlanComparisonComponent } from './components/public-plan-comparison.component';

const PRICING_JSON_LD_ID = 'packages-offers';
const PRICING_FAQ_JSON_LD_ID = 'packages-faq';

/**
 * Paketler (tasarım belgesi 5.5, ADR-035): aylık/yıllık seçici, üç paket kartı, karşılaştırma tablosu, "Şu an yok", SSS.
 * Tüm fiyat ve sınırlar `pricing-plan.utils.ts`'ten; sayfa sayı kopyalamaz.
 */
@Component({
    selector: 'app-public-packages-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicPlanCardsComponent, PublicPlanComparisonComponent, PublicFaqListComponent, PublicCtaComponent],
    template: `
        <app-public-page-header
            eyebrow="Paketler"
            title="Kliniğinize uygun paketi seçin"
            lead="Kayıt defterleri ve KVKK araçları her pakette; fark kullanıcı sayısı, çok klinik ve hasta sahibi portalıdır. Her paketi 14 gün ücretsiz deneyin, kart bilgisi istenmez."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <section class="public-section" aria-labelledby="packages-plans-title">
                <h2 id="packages-plans-title" class="sr-only">Paketler</h2>
                <div class="mb-8 flex flex-col items-center gap-2">
                    <div class="public-period-toggle" role="group" aria-label="Ödeme dönemi">
                        <button type="button" class="public-period-option" [class.public-period-option--active]="period() === 'monthly'" [attr.aria-pressed]="period() === 'monthly'" (click)="period.set('monthly')">
                            Aylık
                        </button>
                        <button type="button" class="public-period-option" [class.public-period-option--active]="period() === 'yearly'" [attr.aria-pressed]="period() === 'yearly'" (click)="period.set('yearly')">
                            Yıllık
                        </button>
                    </div>
                    <p class="m-0 text-sm text-muted-color">{{ pricingTerms }}.</p>
                </div>
                <app-public-plan-cards [plans]="plans" [period]="period()" />
            </section>

            <section class="public-section" aria-labelledby="packages-compare-title">
                <h2 id="packages-compare-title" class="public-h2 m-0 mb-6">Paketleri karşılaştırın</h2>
                <app-public-plan-comparison [plans]="plans" />
            </section>

            <section class="public-section" aria-labelledby="packages-not-title">
                <div class="public-card p-6 md:p-8">
                    <h2 id="packages-not-title" class="m-0 text-lg font-semibold text-surface-900 dark:text-surface-0">Şu an yok</h2>
                    <ul class="m-0 mt-4 grid list-none grid-cols-1 gap-x-8 gap-y-2.5 p-0 sm:grid-cols-2">
                        @for (item of notAvailable; track item) {
                            <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-200">
                                <i class="pi pi-minus mt-0.5 shrink-0 text-surface-500 dark:text-surface-400" aria-hidden="true"></i>
                                <span>{{ item }}</span>
                            </li>
                        }
                    </ul>
                </div>
            </section>

            <section class="public-section mx-auto max-w-3xl" aria-labelledby="packages-faq-title">
                <h2 id="packages-faq-title" class="public-h2 m-0 mb-6">Fiyat ve deneme hakkında</h2>
                <app-public-faq-list [items]="faqs" idPrefix="packages-faq" />
            </section>
        </div>

        <app-public-cta />
    `
})
export class PublicPackagesPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    readonly plans = PRICING_PLAN_DEFS;
    readonly period = signal<PricingBillingPeriod>('monthly');
    readonly pricingTerms = pricingTermsText();
    readonly notAvailable = PRICING_NOT_AVAILABLE;
    readonly faqs = publicFaqsOf('fiyat');

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_PACKAGES_PAGE_META, this.document);
        setPublicJsonLd(this.document, PRICING_JSON_LD_ID, publicPricingJsonLd(this.plans));
        setPublicJsonLd(this.document, PRICING_FAQ_JSON_LD_ID, publicFaqPageJsonLd(this.faqs));
        this.destroyRef.onDestroy(() => {
            removePublicJsonLd(this.document, PRICING_JSON_LD_ID);
            removePublicJsonLd(this.document, PRICING_FAQ_JSON_LD_ID);
        });
    }
}
