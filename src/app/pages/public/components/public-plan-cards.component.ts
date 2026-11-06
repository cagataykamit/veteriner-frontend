import { Component, computed, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import {
    formatUserLimit,
    planHighlights,
    planOffer,
    planPriceView,
    pricingVatNote,
    PRICING_FEATURE_ROWS,
    PRICING_ON_REQUEST_TEXT,
    PRICING_PLAN_DEFS,
    yearlyGiftMonths,
    type PricingBillingPeriod,
    type PricingCatalogState,
    type PricingFeatureRowDef,
    type PricingPlanDef,
    type PricingPriceView
} from '@/app/entities/subscription/utils/pricing-plan.utils';

interface PlanCardVm {
    readonly def: PricingPlanDef;
    readonly price: PricingPriceView | null;
    readonly userLimit: string | null;
    readonly highlights: readonly string[];
}

/**
 * Paket kartları (tasarım belgesi 5.5, ADR-035): yan yana üç kart, önerilen kart teal çerçeve + etiket (gölge yok).
 * Metin ve öne çıkanlar `pricing-plan.utils.ts`'ten; fiyat ve kullanıcı sınırı backend kataloğundan (WEB-007). Katalog
 * yüklenirken yer tutucu, alınamazsa ya da paketin fiyatı yoksa "Fiyat için bize yazın" (iletişim) yazar; sabit sayı yok.
 */
@Component({
    selector: 'app-public-plan-cards',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (periodToggle() && hasYearly()) {
            <div class="mb-6 flex flex-wrap items-center justify-center gap-3">
                <div class="flex gap-2" role="group" aria-label="Ödeme dönemi">
                    @for (option of periodOptions; track option.value) {
                        <button type="button" class="public-chip-tab" [class.public-chip-tab--active]="period() === option.value" [attr.aria-pressed]="period() === option.value" (click)="period.set(option.value)">
                            {{ option.label }}
                        </button>
                    }
                </div>
                @if (yearlyGiftLabel(); as gift) {
                    <span class="public-plan-badge">{{ gift }}</span>
                }
            </div>
        }
        <ul class="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3 md:gap-6" [attr.aria-busy]="pricing().status === 'loading'">
            @for (card of cards(); track card.def.slug) {
                <li class="public-card public-plan-card flex flex-col p-6 md:p-7" [class.public-plan-card--recommended]="card.def.recommended" [attr.data-plan]="card.def.slug">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="m-0 text-xl font-semibold text-surface-900 dark:text-surface-0">{{ card.def.title }}</h3>
                        @if (card.def.recommended) {
                            <span class="public-plan-badge">Önerilen</span>
                        }
                    </div>
                    <p class="m-0 mt-2 text-sm leading-relaxed text-surface-600 md:min-h-[2.75rem] dark:text-surface-300">{{ card.def.description }}</p>

                    @if (pricing().status === 'loading') {
                        <p class="m-0 mt-5 flex items-baseline" data-price-loading>
                            <span class="inline-block h-9 w-32 animate-pulse rounded-md bg-surface-200 dark:bg-surface-700" aria-hidden="true"></span>
                            <span class="sr-only">Fiyat yükleniyor</span>
                        </p>
                        <p class="m-0 mt-1 min-h-5"></p>
                    } @else if (card.price) {
                        <p class="m-0 mt-5 flex items-baseline gap-1.5">
                            <span class="public-plan-price text-surface-900 dark:text-surface-0">{{ card.price.amount }}</span>
                            <span class="text-base text-surface-600 dark:text-surface-300">{{ card.price.unit }}</span>
                        </p>
                        <p class="m-0 mt-1 min-h-5 text-sm text-muted-color">
                            @if (card.price.note) {
                                {{ card.price.note }} ·
                            }
                            {{ vatNote() }}
                        </p>
                    } @else {
                        <p class="m-0 mt-5">
                            <a [routerLink]="paths.contact" class="public-plan-price public-plan-price--text public-brand-link" data-price-on-request>{{ onRequestText }}</a>
                        </p>
                        <p class="m-0 mt-1 min-h-5"></p>
                    }

                    @if (card.userLimit || card.highlights.length > 0) {
                        <ul class="m-0 mt-5 list-none space-y-2.5 border-t border-[var(--public-border)] p-0 pt-5">
                            @if (card.userLimit) {
                                <li class="flex items-start gap-2.5 text-sm font-semibold text-surface-800 dark:text-surface-100">
                                    <i class="pi pi-users mt-0.5 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                    <span>{{ card.userLimit }}</span>
                                </li>
                            }
                            @for (item of card.highlights; track item) {
                                <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-200">
                                    <i class="pi pi-check mt-0.5 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                    <span>{{ item }}</span>
                                </li>
                            }
                        </ul>
                    }

                    <div class="mt-auto pt-6">
                        <a
                            routerLink="/auth/signup"
                            [queryParams]="{ plan: card.def.slug }"
                            class="public-btn w-full"
                            [class.public-btn-primary]="card.def.recommended"
                            [class.public-btn-secondary]="!card.def.recommended"
                            [attr.aria-label]="card.def.title + ' paketini ücretsiz deneyin'"
                            >Ücretsiz dene</a
                        >
                        <p class="m-0 mt-3 text-center text-sm text-muted-color">{{ card.def.trialDays }} gün ücretsiz · kart gerekmez</p>
                    </div>
                </li>
            }
        </ul>
    `
})
export class PublicPlanCardsComponent {
    readonly plans = input<readonly PricingPlanDef[]>(PRICING_PLAN_DEFS);
    readonly featureRows = input<readonly PricingFeatureRowDef[]>(PRICING_FEATURE_ROWS);
    /** Backend paket kataloğu durumu (`PublicPlanCatalogService.state`). */
    readonly pricing = input<PricingCatalogState>({ status: 'loading' });

    readonly paths = PUBLIC_PATHS;
    readonly onRequestText = PRICING_ON_REQUEST_TEXT;
    /** Paketler sayfasında Aylık/Yıllık anahtarı (BILL-001); ana sayfa yalnız aylık gösterir. */
    readonly periodToggle = input(false);
    readonly period = signal<PricingBillingPeriod>('monthly');
    readonly periodOptions: readonly { readonly value: PricingBillingPeriod; readonly label: string }[] = [
        { value: 'monthly', label: 'Aylık' },
        { value: 'yearly', label: 'Yıllık' }
    ];

    private readonly catalog = computed(() => {
        const state = this.pricing();

        return state.status === 'ready' ? state.catalog : null;
    });

    readonly vatNote = computed(() => {
        const catalog = this.catalog();

        return catalog ? pricingVatNote(catalog) : '';
    });

    /** Yıllık anahtarı yalnız katalogda yıllık tutar varken çizilir. */
    readonly hasYearly = computed(() => this.catalog()?.plans.some((p) => p.yearlyPriceTry != null) ?? false);

    readonly yearlyGiftLabel = computed(() => {
        const catalog = this.catalog();
        const gift = catalog ? yearlyGiftMonths(catalog) : 0;

        return gift > 0 ? `Yıllıkta ${gift} ay hediye` : null;
    });

    readonly cards = computed<readonly PlanCardVm[]>(() => {
        const state = this.pricing();
        const period = this.periodToggle() && this.hasYearly() ? this.period() : 'monthly';

        return this.plans().map((def) => {
            const offer = planOffer(state, def);

            return {
                def,
                price: planPriceView(offer, this.catalog(), period),
                userLimit: formatUserLimit(offer?.maxUsers ?? null),
                highlights: planHighlights(def.slug, this.featureRows())
            };
        });
    });
}
