import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import { hasPlanComparison, PRICING_FEATURE_ROWS, PRICING_NOT_AVAILABLE, PRICING_PLAN_DEFS } from '@/app/features/public/utils/pricing-plan.utils';
import { PUBLIC_PACKAGES_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicPlanCardsComponent } from './components/public-plan-cards.component';
import { PublicPlanComparisonComponent } from './components/public-plan-comparison.component';

/**
 * Paketler (tasarım belgesi 5.5, ADR-034 karar 4): üç paket kartı, karşılaştırma tablosu, "bugün yok" listesi, SSS.
 * Tüm değerler `pricing-plan.utils.ts`'ten; karşılaştırma verisi girilmemişse tablo yerine paketten bağımsız yetenek listesi.
 */
@Component({
    selector: 'app-public-packages-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicPlanCardsComponent, PublicPlanComparisonComponent, PublicFaqListComponent, PublicCtaComponent],
    template: `
        <app-public-page-header
            eyebrow="Paketler"
            title="Kliniğinize uygun paketi seçin"
            lead="Her paketi 14 gün ücretsiz deneyin; kart bilgisi istenmez, satış görüşmesi gerekmez."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <section class="public-section" aria-labelledby="packages-plans-title">
                <h2 id="packages-plans-title" class="sr-only">Paketler</h2>
                <app-public-plan-cards [plans]="plans" />
            </section>

            @if (hasComparison) {
                <section class="public-section" aria-labelledby="packages-compare-title">
                    <h2 id="packages-compare-title" class="public-h2 m-0 mb-6">Paketleri karşılaştırın</h2>
                    <app-public-plan-comparison [plans]="plans" />
                </section>
            } @else {
                <section class="public-section" aria-labelledby="packages-capabilities-title">
                    <h2 id="packages-capabilities-title" class="public-h2 m-0">Vetinity ile neler yapabilirsiniz</h2>
                    <div class="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        @for (group of capabilityGroups; track group.group) {
                            <div>
                                <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">{{ group.group }}</h3>
                                <ul class="m-0 mt-3 list-none space-y-2.5 p-0">
                                    @for (label of group.labels; track label) {
                                        <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-200">
                                            <i class="pi pi-check mt-0.5 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                            <span>{{ label }}</span>
                                        </li>
                                    }
                                </ul>
                            </div>
                        }
                    </div>
                </section>
            }

            <section class="public-section" aria-labelledby="packages-not-title">
                <div class="public-card p-6 md:p-8">
                    <h2 id="packages-not-title" class="m-0 text-lg font-semibold text-surface-900 dark:text-surface-0">Bugün yok</h2>
                    <ul class="m-0 mt-4 grid list-none grid-cols-1 gap-x-8 gap-y-2.5 p-0 sm:grid-cols-2">
                        @for (item of notAvailable; track item) {
                            <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-200">
                                <i class="pi pi-minus mt-0.5 shrink-0 text-surface-500 dark:text-surface-400" aria-hidden="true"></i>
                                <span>{{ item }}</span>
                            </li>
                        }
                    </ul>
                    <p class="public-note m-0 mt-4">Yol haritasındadır; tarih vermiyoruz.</p>
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

    readonly plans = PRICING_PLAN_DEFS;
    readonly hasComparison = hasPlanComparison();
    readonly capabilityGroups = [...new Set(PRICING_FEATURE_ROWS.map((r) => r.group))].map((group) => ({
        group,
        labels: PRICING_FEATURE_ROWS.filter((r) => r.group === group).map((r) => r.label)
    }));
    readonly notAvailable = PRICING_NOT_AVAILABLE;
    readonly faqs = publicFaqsOf('fiyat');

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_PACKAGES_PAGE_META, this.document);
    }
}
