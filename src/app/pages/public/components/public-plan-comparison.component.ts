import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
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

interface ComparisonHeadVm {
    readonly def: PricingPlanDef;
    readonly monthly: string | null;
    /** Katalog geldi ama paketin fiyatı yok: "Fiyat için bize yazın". */
    readonly priceOnRequest: boolean;
    readonly users: string | null;
}

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
 * Paket karşılaştırma tablosu (tasarım belgesi 5.5, ADR-035): lacivert başlık bandında paket adı, aylık fiyat ve kullanıcı sınırı;
 * önerilen paketin sütunu baştan sona vurgulu; her alan numaralı bir bantla açılır. Fiyat ve sınır backend kataloğundan (WEB-007);
 * katalog yokken başlıkta yalnız paket adı kalır. Klinik sınırı backend'de yok, gösterilmez. Gösterilecek özellik satırı yoksa hiç
 * çizilmez. Dar ekranda sütunlar sabit, metin sarar; daha darda yalnız tablo kabı kayar.
 */
@Component({
    selector: 'app-public-plan-comparison',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (groups().length > 0) {
            <div class="public-card overflow-x-auto">
                <table class="public-plan-compare w-full border-collapse text-left text-xs sm:text-sm">
                    <caption class="sr-only">Paket karşılaştırması</caption>
                    <thead class="public-plan-compare-head">
                        <tr>
                            <th scope="col" class="w-[31%] px-2 py-4 align-bottom text-xs font-semibold uppercase tracking-wide sm:w-[38%] sm:px-5">Özellik</th>
                            @for (head of heads(); track head.def.slug) {
                                <th scope="col" class="px-1 py-4 text-center align-bottom sm:px-3" [class.public-plan-compare-col--recommended]="head.def.recommended">
                                    @if (head.def.recommended) {
                                        <span class="public-plan-compare-tag">Önerilen</span>
                                    }
                                    <span class="block text-[12px] font-bold tracking-tight sm:text-base sm:tracking-normal">{{ head.def.title }}</span>
                                    @if (head.monthly; as monthly) {
                                        <span class="mt-1 block text-sm font-bold sm:text-xl">{{ monthly }}</span>
                                        <span class="block text-[11px] opacity-80 sm:text-xs">/ ay, {{ vatNote() }}</span>
                                    } @else if (head.priceOnRequest) {
                                        <a [routerLink]="paths.contact" class="public-plan-compare-link mt-1 block text-xs font-medium">{{ onRequestText }}</a>
                                    }
                                    @if (head.users; as users) {
                                        <span class="mt-1 block text-[11px] font-medium opacity-90 sm:text-xs">{{ users }}</span>
                                    }
                                </th>
                            }
                        </tr>
                    </thead>
                    @for (group of groups(); track group.group; let groupNo = $index) {
                        <tbody>
                            <tr class="public-plan-compare-group">
                                <th scope="rowgroup" [attr.colspan]="plans().length + 1" class="px-2 py-2.5 sm:px-5">
                                    <span class="public-plan-compare-group-no" aria-hidden="true">{{ groupNo + 1 }}</span>
                                    <span class="text-xs font-semibold uppercase tracking-wide" data-group-title>{{ group.group }}</span>
                                    <span class="ml-2 text-xs font-normal normal-case text-muted-color" data-group-count>{{ group.rows.length }} özellik</span>
                                </th>
                            </tr>
                            @for (row of group.rows; track row.label) {
                                <tr class="public-plan-compare-row">
                                    <th scope="row" class="px-2 py-3 align-top font-medium text-surface-800 sm:px-5 dark:text-surface-100">
                                        {{ row.label }}
                                        @if (row.detail) {
                                            <span class="mt-0.5 block text-xs font-normal text-muted-color">{{ row.detail }}</span>
                                        }
                                    </th>
                                    @for (cell of row.cells; track $index) {
                                        <td class="px-1 py-3 text-center align-top text-surface-800 sm:px-3 dark:text-surface-100" [class.public-plan-compare-col--recommended]="plans()[$index].recommended">
                                            @if (cell === true) {
                                                <span class="public-plan-compare-yes" aria-hidden="true"><i class="pi pi-check"></i></span><span class="sr-only">Var</span>
                                            } @else if (cell === false || cell === null) {
                                                <span class="public-plan-compare-no" aria-hidden="true"></span><span class="sr-only">Yok</span>
                                            } @else {
                                                <span class="font-medium">{{ cell }}</span>
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

    readonly paths = PUBLIC_PATHS;
    readonly onRequestText = PRICING_ON_REQUEST_TEXT;

    readonly vatNote = computed(() => {
        const state = this.pricing();

        return state.status === 'ready' ? pricingVatNote(state.catalog) : '';
    });

    readonly heads = computed<readonly ComparisonHeadVm[]>(() => {
        const state = this.pricing();

        return this.plans().map((def) => {
            const offer = planOffer(state, def);
            const monthly = formatPlanPrice(offer?.monthlyPriceTry ?? null);

            return { def, monthly, priceOnRequest: state.status === 'ready' && monthly === null, users: formatUserLimit(offer?.maxUsers ?? null) };
        });
    });

    readonly groups = computed<readonly ComparisonGroupVm[]>(() => {
        const plans = this.plans();
        const byGroup = new Map<string, ComparisonRowVm[]>();

        for (const row of decidedFeatureRows(this.featureRows())) {
            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), { label: row.label, detail: row.detail, cells: plans.map((p) => row.plans[p.slug]) }]);
        }

        return [...byGroup].map(([group, rows]) => ({ group, rows }));
    });
}
