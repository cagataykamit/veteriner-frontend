import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import {
    decidedFeatureRows,
    formatPlanPrice,
    formatUserLimit,
    planOffer,
    pricingVatNote,
    PRICING_FEATURE_ROWS,
    PRICING_ON_REQUEST_TEXT,
    PRICING_PLAN_DEFS,
    type PricingCatalogState,
    type PricingFeatureCell,
    type PricingFeatureRowDef,
    type PricingPlanDef
} from '@/app/entities/subscription/utils/pricing-plan.utils';

interface ComparisonRowVm {
    readonly label: string;
    readonly detail?: string;
    readonly cells: readonly PricingFeatureCell[];
}

interface ComparisonGroupVm {
    readonly group: string;
    readonly rows: readonly ComparisonRowVm[];
}

/**
 * Paket karşılaştırma tablosu (tasarım belgesi 5.5, ADR-035): fiyat, kullanıcı sınırı ve özellik satırları, gruplu.
 * Fiyat ve sınır backend kataloğundan (WEB-007); katalog yokken bu satırlar çizilmez. Klinik sınırı backend'de yok, satırı yok.
 * Gösterilecek satır yoksa hiç çizilmez. Dar ekranda yazı ve boşluk küçülür; taşarsa yalnız tablo kabı kayar.
 */
@Component({
    selector: 'app-public-plan-comparison',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (groups().length > 0) {
            <div class="public-card overflow-x-auto">
                <table class="public-plan-table w-full border-collapse text-left text-xs sm:text-sm">
                    <caption class="sr-only">Paket karşılaştırması</caption>
                    <thead>
                        <tr>
                            <th scope="col" class="w-2/5 px-3 py-3 sm:px-4 font-semibold text-surface-900 dark:text-surface-0">Özellik</th>
                            @for (plan of plans(); track plan.slug) {
                                <th scope="col" class="px-1.5 py-3 text-center sm:px-3 font-semibold text-surface-900 dark:text-surface-0">{{ plan.title }}</th>
                            }
                        </tr>
                    </thead>
                    @for (group of groups(); track group.group) {
                        <tbody>
                            <tr>
                                <th scope="colgroup" [attr.colspan]="plans().length + 1" class="public-plan-table-group px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide">
                                    {{ group.group }}
                                </th>
                            </tr>
                            @for (row of group.rows; track row.label) {
                                <tr>
                                    <th scope="row" class="px-3 py-3 align-top font-medium sm:px-4 text-surface-800 dark:text-surface-100">
                                        {{ row.label }}
                                        @if (row.detail) {
                                            <span class="mt-0.5 block text-xs font-normal text-muted-color">{{ row.detail }}</span>
                                        }
                                    </th>
                                    @for (cell of row.cells; track $index) {
                                        <td class="px-1.5 py-3 text-center sm:px-3 align-top text-surface-800 dark:text-surface-100">
                                            @if (cell === true) {
                                                <i class="pi pi-check text-[var(--public-accent)]" aria-hidden="true"></i><span class="sr-only">Var</span>
                                            } @else if (cell === false || cell === null) {
                                                <i class="pi pi-minus text-surface-500 dark:text-surface-400" aria-hidden="true"></i><span class="sr-only">Yok</span>
                                            } @else {
                                                {{ cell }}
                                            }
                                        </td>
                                    }
                                </tr>
                            }
                        </tbody>
                    }
                </table>
            </div>
        }
    `
})
export class PublicPlanComparisonComponent {
    readonly plans = input<readonly PricingPlanDef[]>(PRICING_PLAN_DEFS);
    readonly featureRows = input<readonly PricingFeatureRowDef[]>(PRICING_FEATURE_ROWS);
    /** Backend paket kataloğu durumu (`PublicPlanCatalogService.state`). */
    readonly pricing = input<PricingCatalogState>({ status: 'loading' });

    readonly groups = computed<readonly ComparisonGroupVm[]>(() => {
        const plans = this.plans();
        const state = this.pricing();
        const offers = plans.map((p) => planOffer(state, p));
        const priceRows: ComparisonRowVm[] = [];
        const limitRows: ComparisonRowVm[] = [];

        if (state.status === 'ready') {
            const vat = pricingVatNote(state.catalog);
            const price = (amount: number | null | undefined): PricingFeatureCell => formatPlanPrice(amount ?? null) ?? PRICING_ON_REQUEST_TEXT;

            priceRows.push({ label: `Aylık (${vat})`, cells: offers.map((o) => price(o?.monthlyPriceTry)) });

            if (offers.some((o) => o?.yearlyPriceTry != null)) {
                priceRows.push({ label: `Yıllık (${state.catalog.yearlyBilledMonths} ay ücreti, ${vat})`, cells: offers.map((o) => price(o?.yearlyPriceTry)) });
            }

            const users = offers.map((o) => formatUserLimit(o?.maxUsers ?? null));

            if (users.some((cell) => cell !== null)) {
                limitRows.push({ label: 'Kullanıcı', cells: users });
            }
        }

        const byGroup = new Map<string, ComparisonRowVm[]>();

        for (const row of decidedFeatureRows(this.featureRows())) {
            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), { label: row.label, detail: row.detail, cells: plans.map((p) => row.plans[p.slug]) }]);
        }

        return [
            ...(priceRows.length > 0 ? [{ group: 'Fiyat', rows: priceRows }] : []),
            ...(limitRows.length > 0 ? [{ group: 'Sınırlar', rows: limitRows }] : []),
            ...[...byGroup].map(([group, rows]) => ({ group, rows }))
        ];
    });
}
