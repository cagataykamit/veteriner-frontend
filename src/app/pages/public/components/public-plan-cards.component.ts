import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    formatPlanLimit,
    formatPlanPrice,
    planHighlights,
    PRICING_FEATURE_ROWS,
    PRICING_PLAN_DEFS,
    type PricingFeatureRowDef,
    type PricingPlanDef
} from '@/app/features/public/utils/pricing-plan.utils';

interface PlanCardVm {
    readonly def: PricingPlanDef;
    readonly price: string | null;
    readonly limits: readonly string[];
    readonly highlights: readonly string[];
}

/**
 * Paket kartları (tasarım belgesi 5.5): yan yana üç kart, önerilen kart teal çerçeve + etiket (gölge yok).
 * Fiyat, sınır ve öne çıkanlar `pricing-plan.utils.ts` verisinden; girilmemiş alan kartta hiç çıkmaz.
 */
@Component({
    selector: 'app-public-plan-cards',
    standalone: true,
    imports: [RouterLink],
    template: `
        <ul class="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3 md:gap-6">
            @for (card of cards(); track card.def.slug) {
                <li class="public-card public-plan-card flex flex-col p-6 md:p-7" [class.public-plan-card--recommended]="card.def.recommended" [attr.data-plan]="card.def.slug">
                    <div class="flex items-center justify-between gap-3">
                        <h3 class="m-0 text-xl font-semibold text-surface-900 dark:text-surface-0">{{ card.def.title }}</h3>
                        @if (card.def.recommended) {
                            <span class="public-plan-badge">Önerilen</span>
                        }
                    </div>
                    <p class="m-0 mt-2 text-sm leading-relaxed text-surface-600 md:min-h-[2.75rem] dark:text-surface-300">{{ card.def.description }}</p>

                    @if (card.price) {
                        <p class="m-0 mt-5 flex items-baseline gap-1.5">
                            <span class="text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-0">{{ card.price }}</span>
                            <span class="text-base text-surface-600 dark:text-surface-300">/ ay</span>
                        </p>
                        @if (card.def.priceNote) {
                            <p class="m-0 mt-1 text-sm text-muted-color">{{ card.def.priceNote }}</p>
                        }
                    }

                    @if (card.limits.length > 0 || card.highlights.length > 0) {
                        <ul class="m-0 mt-5 list-none space-y-2.5 border-t border-[var(--public-border)] p-0 pt-5">
                            @for (item of card.limits; track item) {
                                <li class="flex items-start gap-2.5 text-sm font-semibold text-surface-800 dark:text-surface-100">
                                    <i class="pi pi-users mt-0.5 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                    <span>{{ item }}</span>
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

    readonly cards = computed<readonly PlanCardVm[]>(() =>
        this.plans().map((def) => ({
            def,
            price: formatPlanPrice(def.monthlyPriceTry),
            limits: [formatPlanLimit(def.maxUsers, 'kullanıcı'), formatPlanLimit(def.maxClinics, 'klinik')].filter((l): l is string => l !== null),
            highlights: planHighlights(def.slug, this.featureRows())
        }))
    );
}
