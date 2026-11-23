import { Component, computed, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import {
    decidedFeatureRows,
    formatPlanPrice,
    formatUserLimit,
    isPlanDifferenceRow,
    planOffer,
    pricingFeatureRowsWithCatalog,
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
    readonly badge?: string;
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
 * çizilmez. Dar ekranda sütunlar sabit, metin sarar; daha darda yalnız tablo kabı kayar. "Sadece farkları göster" (varsayılan
 * kapalı, TIER-023) her pakette aynı olan satırları gizler; boş kalan alan bandı da gizlenir.
 * Telefonda (768 px altı, T-04 A) tablo yerine üstte yapışkan paket seçici ve yalnız seçili paketin listesi; farklar açık başlar,
 * pakette olmayan özellik soluk ve hangi pakette olduğunu söyler. Satırlar aynı kaynaktan (`pricing-plan.utils.ts`).
 */
@Component({
    selector: 'app-public-plan-comparison',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        /* Telefon (T-04 A): yapışkan paket seçici ve tek sütun liste; renkler tanıtım değişkenlerinden. */
        .plan-phone-picker {
            position: sticky;
            /* Telefonda tanıtım üst çubuğunun altı (10 px boşluk + 64 px çubuk) */
            top: 74px;
            z-index: 5;
            margin-inline: -4px;
            padding: 8px 4px 10px;
            background: var(--ps-bg, var(--p-surface-0));
        }

        .plan-phone-seg {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 4px;
            padding: 4px;
            border: 1px solid var(--public-border);
            border-radius: 999px;
            background: var(--ps-card, var(--p-surface-0));
        }

        .plan-phone-seg button {
            min-height: 44px;
            padding: 0 6px;
            border: 0;
            border-radius: 999px;
            background: transparent;
            color: var(--ps-ink, inherit);
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
            cursor: pointer;
        }

        .plan-phone-seg button[aria-checked='true'] {
            background: var(--ps-ink, var(--vetinity-navy));
            color: var(--ps-bg, #ffffff);
        }

        .plan-phone-seg button:focus-visible {
            outline: 2px solid var(--public-accent);
            outline-offset: 2px;
        }

        .plan-phone-band {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            padding: 10px 4px 8px;
            border-bottom: 2px solid var(--public-border);
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
        }

        .plan-phone-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 4px;
            border-bottom: 1px solid var(--public-border);
        }

        .plan-phone-row--off .plan-phone-label {
            opacity: 0.62;
        }

        .plan-phone-up {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 10px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--public-accent) 12%, transparent);
            color: var(--public-accent);
            font-size: 12px;
            font-weight: 600;
        }
    `,
    template: `
        @if (hasRows()) {
            <!-- Telefon (768 px altı, T-04 A): paket seçici + seçili paketin tek sütun listesi; farklar açık başlar. Masaüstü tablosu aşağıda, değişmedi. -->
            <div class="md:hidden" data-plan-phone>
                <div class="plan-phone-picker">
                    <div class="plan-phone-seg" role="radiogroup" aria-label="Paket">
                        @for (head of heads(); track head.def.slug; let i = $index) {
                            <button type="button" role="radio" [attr.aria-checked]="phonePlan() === i" (click)="phonePlan.set(i)" [attr.data-phone-plan]="head.def.slug">{{ head.def.title }}</button>
                        }
                    </div>
                    @if (heads()[phonePlan()]; as head) {
                        <p class="m-0 mt-2 text-center text-sm" data-phone-price>
                            @if (head.monthly; as monthly) {
                                <b class="text-base">{{ monthly }}</b><span class="text-muted-color">&nbsp;/ ay, {{ vatNote() }}</span>
                            } @else if (head.priceOnRequest) {
                                <a [routerLink]="paths.contact" class="public-brand-link font-medium">{{ onRequestText }}</a>
                            }
                            @if (head.users; as users) {
                                <span class="text-muted-color">&nbsp;· {{ users }}</span>
                            }
                        </p>
                    }
                </div>
                <label class="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium">
                    <input type="checkbox" role="switch" class="h-4 w-4 accent-[var(--public-accent)]" [checked]="phoneOnlyDifferences()" (change)="phoneOnlyDifferences.set($any($event.target).checked)" data-phone-only-differences />
                    Sadece farkları göster
                </label>
                <p class="m-0 text-sm text-muted-color" data-phone-count>{{ phoneCountText() }}</p>
                @for (group of phoneGroups(); track group.group; let groupNo = $index) {
                    <div class="plan-phone-band">
                        <span class="public-plan-compare-group-no" aria-hidden="true">{{ groupNo + 1 }}</span>{{ group.group }}
                        <span class="ml-auto text-xs font-normal normal-case tracking-normal text-muted-color">{{ group.rows.length }} özellik</span>
                    </div>
                    @for (row of group.rows; track row.label) {
                        <div class="plan-phone-row" [class.plan-phone-row--off]="!row.on" data-phone-row>
                            <div class="plan-phone-label min-w-0 flex-1">
                                <b class="block text-[15px] font-semibold">{{ row.label }}</b>
                                @if (row.value) {
                                    <span class="block text-sm font-medium">{{ row.value }}</span>
                                }
                                @if (row.detail) {
                                    <span class="mt-0.5 block text-[13px] text-muted-color">{{ row.detail }}</span>
                                }
                                @if (!row.on && row.availableIn) {
                                    <span class="plan-phone-up" data-phone-available>{{ row.availableIn }}</span>
                                }
                            </div>
                            <div class="flex shrink-0 flex-col items-end">
                                @if (row.on) {
                                    <span class="public-plan-compare-yes" aria-hidden="true"><i class="pi pi-check"></i></span><span class="sr-only">Var</span>
                                } @else {
                                    <span class="public-plan-compare-no" aria-hidden="true"><i class="pi pi-times"></i></span><span class="sr-only">Yok</span>
                                }
                            </div>
                        </div>
                    }
                }
            </div>

            <div class="hidden md:block">
            <div class="mb-4 flex justify-end">
                <label class="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium text-surface-800 dark:text-surface-100">
                    <input
                        type="checkbox"
                        role="switch"
                        class="h-4 w-4 accent-[var(--public-accent)]"
                        [checked]="onlyDifferences()"
                        (change)="onlyDifferences.set($any($event.target).checked)"
                        data-only-differences
                    />
                    Sadece farkları göster
                </label>
            </div>
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
                                        @if (row.badge) {
                                            <span class="public-plan-badge ml-1 align-middle" data-row-badge>{{ row.badge }}</span>
                                        }
                                        @if (row.detail) {
                                            <span class="mt-0.5 block text-xs font-normal text-muted-color">{{ row.detail }}</span>
                                        }
                                    </th>
                                    @for (cell of row.cells; track $index) {
                                        <td class="px-1 py-3 text-center align-top text-surface-800 sm:px-3 dark:text-surface-100" [class.public-plan-compare-col--recommended]="plans()[$index].recommended">
                                            @if (cell === true) {
                                                <span class="public-plan-compare-yes" aria-hidden="true"><i class="pi pi-check"></i></span><span class="sr-only">Var</span>
                                            } @else if (cell === false || cell === null) {
                                                <span class="public-plan-compare-no" aria-hidden="true"><i class="pi pi-times"></i></span><span class="sr-only">Yok</span>
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
    /** "Sadece farkları göster" anahtarı; varsayılan kapalı (tüm satırlar). */
    readonly onlyDifferences = signal(false);

    /** Özellik satırları ve katalogdan gelen yapay zekâ kredisi satırı. */
    private readonly rows = computed(() => pricingFeatureRowsWithCatalog(this.pricing(), this.featureRows()));

    readonly hasRows = computed(() => decidedFeatureRows(this.rows()).length > 0);

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

        const rows = decidedFeatureRows(this.rows()).filter((row) => !this.onlyDifferences() || isPlanDifferenceRow(row));

        for (const row of rows) {
            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), { label: row.label, detail: row.detail, badge: row.badge, cells: plans.map((p) => row.plans[p.slug]) }]);
        }

        return [...byGroup].map(([group, rows]) => ({ group, rows }));
    });

    /** Telefon: seçili paketin sırası (varsayılan önerilen paket) ve "Sadece farkları göster" (telefonda açık başlar, T-04 A). */
    readonly phonePlan = signal(Math.max(0, PRICING_PLAN_DEFS.findIndex((p) => p.recommended)));
    readonly phoneOnlyDifferences = signal(true);

    readonly phoneCountText = computed(() => {
        const rows = decidedFeatureRows(this.rows());
        const differences = rows.filter(isPlanDifferenceRow).length;

        return this.phoneOnlyDifferences() ? `${differences} fark gösteriliyor; ${rows.length - differences} özellik her pakette aynı.` : `${rows.length} özelliğin tamamı gösteriliyor.`;
    });

    /** Seçili paketin satırları: pakette yoksa soluk ve hangi paketlerde olduğu yazılır. */
    readonly phoneGroups = computed<readonly PhoneGroupVm[]>(() => {
        const plans = this.plans();
        const selected = plans[this.phonePlan()] ?? plans[0];
        const byGroup = new Map<string, PhoneRowVm[]>();

        for (const row of decidedFeatureRows(this.rows()).filter((r) => !this.phoneOnlyDifferences() || isPlanDifferenceRow(r))) {
            const cell = row.plans[selected.slug];
            const on = cell !== false && cell !== null;
            const vm: PhoneRowVm = { label: row.label, detail: row.detail, value: typeof cell === 'string' ? cell : null, on, availableIn: on ? null : availableInLabel(plans.filter((p) => hasCell(row.plans[p.slug]))) };

            byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), vm]);
        }

        return [...byGroup].map(([group, rows]) => ({ group, rows }));
    });
}

interface PhoneRowVm {
    readonly label: string;
    readonly detail?: string;
    /** Metin hücresi (ör. destek kanalı). */
    readonly value: string | null;
    readonly on: boolean;
    /** Pakette yoksa: "Profesyonel ve Kurumsal'da var". */
    readonly availableIn: string | null;
}

interface PhoneGroupVm {
    readonly group: string;
    readonly rows: readonly PhoneRowVm[];
}

const hasCell = (cell: PricingFeatureCell): boolean => cell !== false && cell !== null;

/** "Kurumsal'da var", "Profesyonel ve Kurumsal'da var": bulunma eki son paket adının son ünlüsüne ve son sessizine uyar. */
function availableInLabel(plans: readonly PricingPlanDef[]): string | null {
    if (plans.length === 0) {
        return null;
    }

    const names = plans.map((p) => p.title);
    const last = names.at(-1)!;
    const vowel = [...last.toLocaleLowerCase('tr')].reverse().find((ch) => 'aıoueiöü'.includes(ch)) ?? 'a';
    const hard = 'çfhkpsşt'.includes(last.toLocaleLowerCase('tr').at(-1) ?? '');
    const suffix = (hard ? 't' : 'd') + ('aıou'.includes(vowel) ? 'a' : 'e');
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ve ${last}` : last;

    return `${list}'${suffix} var`;
}
