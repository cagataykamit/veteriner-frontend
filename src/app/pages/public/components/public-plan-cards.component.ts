import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import {
    formatPlanLimit,
    planHighlights,
    planPriceView,
    PRICING_FEATURE_ROWS,
    PRICING_PLAN_DEFS,
    PRICING_VAT_NOTE,
    type PricingFeatureRowDef,
    type PricingPlanDef,
    type PricingPriceView
} from '@/app/features/public/utils/pricing-plan.utils';

interface PlanCardVm {
    readonly def: PricingPlanDef;
    readonly price: PricingPriceView | null;
    readonly limits: readonly { readonly label: string; readonly icon: string }[];
    readonly highlights: readonly string[];
}

/**
 * Paket kartları (tasarım belgesi 5.5, ADR-035): yan yana üç kart, önerilen kart teal çerçeve + etiket (gölge yok).
 * Fiyat, sınır ve öne çıkanlar `pricing-plan.utils.ts` verisinden; teklifli pakette düğme iletişime gider.
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
                            <span class="public-plan-price text-surface-900 dark:text-surface-0" [class.public-plan-price--text]="!card.price.unit">{{ card.price.amount }}</span>
                            @if (card.price.unit) {
                                <span class="text-base text-surface-600 dark:text-surface-300">{{ card.price.unit }}</span>
                            }
                        </p>
                        <p class="m-0 mt-1 min-h-5 text-sm text-muted-color">
                            @if (card.price.unit) {
                                {{ vatNote }}
                            } @else {
                                Kliniğinize göre teklif
                            }
                        </p>
                    }

                    @if (card.limits.length > 0 || card.highlights.length > 0) {
                        <ul class="m-0 mt-5 list-none space-y-2.5 border-t border-[var(--public-border)] p-0 pt-5">
                            @for (item of card.limits; track item.label) {
                                <li class="flex items-start gap-2.5 text-sm font-semibold text-surface-800 dark:text-surface-100">
                                    <i [class]="item.icon + ' mt-0.5 shrink-0 text-[var(--public-accent)]'" aria-hidden="true"></i>
                                    <span>{{ item.label }}</span>
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
                        @if (card.def.priceOnRequest) {
                            <a
                                [routerLink]="paths.contact"
                                class="public-btn w-full"
                                [class.public-btn-primary]="card.def.recommended"
                                [class.public-btn-secondary]="!card.def.recommended"
                                [attr.aria-label]="card.def.title + ' paketi için iletişime geçin'"
                                >İletişime geçin</a
                            >
                            <p class="m-0 mt-3 text-center text-sm text-muted-color">
                                ya da
                                <a routerLink="/auth/signup" [queryParams]="{ plan: card.def.slug }" class="public-brand-link">{{ card.def.trialDays }} gün ücretsiz deneyin</a>
                            </p>
                        } @else {
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
                        }
                    </div>
                </li>
            }
        </ul>
    `
})
export class PublicPlanCardsComponent {
    readonly plans = input<readonly PricingPlanDef[]>(PRICING_PLAN_DEFS);
    readonly featureRows = input<readonly PricingFeatureRowDef[]>(PRICING_FEATURE_ROWS);

    readonly paths = PUBLIC_PATHS;
    readonly vatNote = PRICING_VAT_NOTE;

    readonly cards = computed<readonly PlanCardVm[]>(() =>
        this.plans().map((def) => ({
            def,
            price: planPriceView(def),
            limits: [
                { label: formatPlanLimit(def.maxClinics, 'klinik'), icon: 'pi pi-building' },
                { label: formatPlanLimit(def.maxUsers, 'kullanıcı'), icon: 'pi pi-users' }
            ].filter((l): l is { label: string; icon: string } => l.label !== null),
            highlights: planHighlights(def.slug, this.featureRows())
        }))
    );
}
