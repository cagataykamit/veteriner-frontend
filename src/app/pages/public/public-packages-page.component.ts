import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, effect, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PUBLIC_PACKAGES_FAQ_CATEGORY_ID, publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import { PRICING_NOT_AVAILABLE, PRICING_PLAN_DEFS, pricingTermsText } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PublicPlanCatalogService } from '@/app/features/public/services/public-plan-catalog.service';
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
 * Paketler (tasarım belgesi 5.5, ADR-035, WEB-007): üç paket kartı (Aylık/Yıllık), karşılaştırma tablosu, "Şu an yok", SSS.
 * Paket metni `pricing-plan.utils.ts`'ten; fiyat, yıllık kural ve kullanıcı sınırı backend kataloğundan, sayfa sayı kopyalamaz.
 * Teklif (JSON-LD) yalnız katalog gelince yazılır.
 */
@Component({
    selector: 'app-public-packages-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicPlanCardsComponent, PublicPlanComparisonComponent, PublicFaqListComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header
            eyebrow="Paketler"
            title="Kliniğinize uygun paketi seçin"
            lead="Kayıt defterleri, KVKK araçları, klinik web sitesi ve online randevu her pakette; üst paketler kullanıcı sayısını ve ek araçları artırır. Her paketi 14 gün ücretsiz deneyin, kart bilgisi istenmez."
        />

        <section class="ps-section ps-section--tight" aria-labelledby="packages-plans-title">
            <div class="ps-wrap">
                <h2 id="packages-plans-title" class="sr-only">Paketler</h2>
                <p class="ps-small ps-center ps-terms">{{ pricingTerms }}.</p>
                <app-public-plan-cards [plans]="plans" [pricing]="pricing()" [periodToggle]="true" />
            </div>
        </section>

        <section class="ps-section ps-section--band" aria-labelledby="packages-compare-title">
            <div class="ps-wrap">
                <header class="ps-head ps-head--center">
                    <h2 id="packages-compare-title" class="public-h2">Paketleri karşılaştırın</h2>
                </header>
                <app-public-plan-comparison [plans]="plans" [pricing]="pricing()" />
            </div>
        </section>

        <section class="ps-section ps-section--tight" aria-labelledby="packages-not-title">
            <div class="ps-wrap">
                <div class="ps-card ps-card--quiet">
                    <h2 id="packages-not-title" class="ps-h3"><span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-clock"></i></span>Şu an yok</h2>
                    <ul class="ps-list ps-ticklist ps-ticklist--two">
                        @for (item of notAvailable; track item) {
                            <li><i class="pi pi-minus" aria-hidden="true"></i><span>{{ item }}</span></li>
                        }
                    </ul>
                </div>
            </div>
        </section>

        <section class="ps-section ps-section--band" aria-labelledby="packages-faq-title">
            <div class="ps-wrap ps-narrow">
                <header class="ps-head ps-head--center">
                    <h2 id="packages-faq-title" class="public-h2">Fiyat ve deneme hakkında</h2>
                </header>
                <app-public-faq-list [items]="faqs" idPrefix="packages-faq" />
            </div>
        </section>

        <app-public-cta />
    `
})
export class PublicPackagesPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly planCatalog = inject(PublicPlanCatalogService);

    readonly plans = PRICING_PLAN_DEFS;
    readonly pricing = this.planCatalog.state;
    readonly pricingTerms = pricingTermsText();
    readonly notAvailable = PRICING_NOT_AVAILABLE;
    readonly faqs = publicFaqsOf(PUBLIC_PACKAGES_FAQ_CATEGORY_ID);

    constructor() {
        effect(() => {
            const state = this.pricing();

            if (state.status === 'ready') {
                setPublicJsonLd(this.document, PRICING_JSON_LD_ID, publicPricingJsonLd(state.catalog, this.plans));
            } else {
                removePublicJsonLd(this.document, PRICING_JSON_LD_ID);
            }
        });
    }

    ngOnInit(): void {
        this.planCatalog.ensureLoaded();
        setPublicPageMeta(this.title, this.meta, PUBLIC_PACKAGES_PAGE_META, this.document);
        setPublicJsonLd(this.document, PRICING_FAQ_JSON_LD_ID, publicFaqPageJsonLd(this.faqs));
        this.destroyRef.onDestroy(() => {
            removePublicJsonLd(this.document, PRICING_JSON_LD_ID);
            removePublicJsonLd(this.document, PRICING_FAQ_JSON_LD_ID);
        });
    }
}
