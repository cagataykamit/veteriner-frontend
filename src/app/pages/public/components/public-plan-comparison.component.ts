import { Component, computed, input } from '@angular/core';
import {
    decidedFeatureRows,
    formatPlanLimit,
    hasPlanComparison,
    PRICING_FEATURE_ROWS,
    PRICING_PLAN_DEFS,
    type PricingFeatureCell,
    type PricingFeatureRowDef,
    type PricingPlanDef
} from '@/app/features/public/utils/pricing-plan.utils';

interface ComparisonGroupVm {
    readonly group: string;
    readonly rows: readonly { readonly label: string; readonly cells: readonly PricingFeatureCell[] }[];
}

/**
 * Paket karşılaştırma tablosu (tasarım belgesi 5.5): sınırlar + doldurulmuş özellik satırları, gruplu.
 * Gösterilecek satır yoksa hiç çizilmez (`hasRows`); sayfa bu durumda paketten bağımsız yetenek listesini gösterir.
 */
@Component({
    selector: 'app-public-plan-comparison',
    standalone: true,
    template: `
        @if (hasRows()) {
            <div class="public-card overflow-x-auto">
                <table class="public-plan-table w-full border-collapse text-left text-sm">
                    <caption class="sr-only">Paket karşılaştırması</caption>
                    <thead>
                        <tr>
                            <th scope="col" class="w-2/5 px-4 py-3 font-semibold text-surface-900 dark:text-surface-0">Özellik</th>
                            @for (plan of plans(); track plan.slug) {
                                <th scope="col" class="px-3 py-3 text-center font-semibold text-surface-900 dark:text-surface-0">{{ plan.title }}</th>
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
                                    <th scope="row" class="px-4 py-3 font-medium text-surface-800 dark:text-surface-100">{{ row.label }}</th>
                                    @for (cell of row.cells; track $index) {
                                        <td class="px-3 py-3 text-center text-surface-800 dark:text-surface-100">
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

    readonly groups = computed<readonly ComparisonGroupVm[]>(() => {
        const plans = this.plans();
        const limitRows = [
            { label: 'Kullanıcı', cells: plans.map((p) => formatPlanLimit(p.maxUsers, 'kullanıcı')) },
            { label: 'Klinik', cells: plans.map((p) => formatPlanLimit(p.maxClinics, 'klinik')) }
        ].filter((row) => row.cells.some((cell) => cell !== null));
        const byGroup = new Map<string, ComparisonGroupVm['rows'][number][]>();

        for (const row of decidedFeatureRows(this.featureRows())) {
            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), { label: row.label, cells: plans.map((p) => row.plans[p.slug]) }]);
        }

        return [...(limitRows.length > 0 ? [{ group: 'Sınırlar', rows: limitRows }] : []), ...[...byGroup].map(([group, rows]) => ({ group, rows }))];
    });

    readonly hasRows = computed(() => hasPlanComparison(this.plans(), this.featureRows()));
}
