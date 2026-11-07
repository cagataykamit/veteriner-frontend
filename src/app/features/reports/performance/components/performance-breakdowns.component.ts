import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import type { PerformanceBreakdownPeriodDto, PerformanceBreakdownsDto } from '@/app/features/reports/performance/models/performance-breakdowns.model';
import { deltaPercentText, performanceDelta } from '@/app/features/reports/performance/utils/performance.utils';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Tablo satırı: ad, adet, ciro ve önceki döneme göre ciro farkı. */
export interface BreakdownRow {
    readonly key: string;
    readonly name: string;
    readonly count: number | null;
    readonly amount: number | null;
    readonly deltaText: string | null;
}

const LINE_KIND_LABELS: Readonly<Record<string, string>> = { Service: 'Hizmet', Product: 'Ürün' };

/** Önceki dönemde aynı anahtarlı satırla ciro farkı; karşılaştırma kapalıysa `null`. */
export function breakdownRows<T>(
    current: readonly T[] | null | undefined,
    previous: readonly T[] | null | undefined,
    pick: (row: T) => { key: string; name: string; count: number | null; amount: number | null },
    comparing: boolean
): BreakdownRow[] {
    const before = new Map((previous ?? []).map((r) => [pick(r).key, pick(r)]));

    return (current ?? []).map((r) => {
        const row = pick(r);
        const delta = comparing ? performanceDelta(row.amount, before.get(row.key)?.amount ?? (row.amount == null ? null : 0)) : null;

        return { ...row, deltaText: deltaPercentText(delta) };
    });
}

/**
 * Gelişmiş raporlar (TIER-004, `PERFORMANCE_BREAKDOWNS_API_CONTRACT.md`): hekim, satır türü, kalem, tür ve geliş, önceki dönemle.
 * Süzgeç işletme performansı sayfasınınkidir. Pakette yoksa "üst pakete geç" kutusu çıkar; istek gönderilmez.
 */
@Component({
    selector: 'app-performance-breakdowns',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AppPlanUpgradeNoticeComponent],
    template: `
        <section class="card mt-4 mb-0" aria-labelledby="perfBreakdownsTitle" data-testid="perf-breakdowns">
            <h5 id="perfBreakdownsTitle" class="mt-0">Kırılımlar</h5>
            @if (planLocked()) {
                <app-plan-upgrade-notice feature="AdvancedReports" detail="Hekim, hizmet ve ürün, hayvan türü kırılımları ve geliş sayısı; her biri önceki dönemle karşılaştırmalı." />
            } @else if (loading()) {
                <p class="m-0 text-sm text-muted-color">Kırılımlar yükleniyor…</p>
            } @else if (error(); as err) {
                <p class="m-0 text-sm text-red-500" role="alert">{{ err }}</p>
            } @else if (data(); as d) {
                @if (d.current.activity; as a) {
                    <p class="mt-0 mb-4 text-sm" data-testid="perf-activity">
                        Geliş: <span class="font-medium">{{ a.visitCount }}</span> · Gelen hasta sahibi: <span class="font-medium">{{ a.clientCount }}</span>
                    </p>
                }
                <div class="grid grid-cols-12 gap-4">
                    @for (table of tables(); track table.key) {
                        <div class="col-span-12 lg:col-span-6" [attr.data-testid]="'perf-' + table.key">
                            <h6 class="mt-0 mb-2">{{ table.title }}</h6>
                            @if (table.rows.length === 0) {
                                <p class="m-0 text-sm text-muted-color">Bu dönemde kayıt yok.</p>
                            } @else {
                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm">
                                        <thead>
                                            <tr class="text-left text-muted-color">
                                                <th class="py-1 pr-2 font-medium">{{ table.nameLabel }}</th>
                                                <th class="py-1 pr-2 font-medium text-right">{{ table.countLabel }}</th>
                                                <th class="py-1 pr-2 font-medium text-right">Net ciro</th>
                                                @if (comparing()) {
                                                    <th class="py-1 font-medium text-right">Fark</th>
                                                }
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @for (row of table.rows; track row.key) {
                                                <tr class="border-t border-surface">
                                                    <td class="py-1 pr-2">{{ row.name }}</td>
                                                    <td class="py-1 pr-2 text-right">{{ row.count ?? '—' }}</td>
                                                    <td class="py-1 pr-2 text-right">{{ money(row.amount) }}</td>
                                                    @if (comparing()) {
                                                        <td class="py-1 text-right text-muted-color">{{ row.deltaText ?? '—' }}</td>
                                                    }
                                                </tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </div>
                    }
                </div>
                <small class="block mt-3 text-muted-color">
                    Net ciro gün sonu raporuyla aynı hesaptır. Hekim: ziyaretin sorumlu hekimi, ziyaretsiz muayenede kesinleştiren; eşleşmeyen satış "Atanmamış". Kalem ücret açıklamasına göredir.
                </small>
            }
        </section>
    `
})
export class PerformanceBreakdownsComponent {
    private readonly api = inject(ApiClient);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);
    private request: Subscription | null = null;

    readonly from = input.required<string>();
    readonly to = input.required<string>();
    readonly compare = input(true);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<PerformanceBreakdownsDto | null>(null);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('AdvancedReports') !== null);
    readonly comparing = computed(() => this.data()?.previous != null);

    readonly tables = computed(() => {
        const d = this.data();

        if (!d) {
            return [];
        }

        const c = d.current;
        const p: PerformanceBreakdownPeriodDto | null = d.previous;
        const cmp = p != null;
        const all = [
            c.byVeterinarian && {
                key: 'veterinarians',
                title: 'Hekim',
                nameLabel: 'Hekim',
                countLabel: 'Muayene',
                rows: breakdownRows(c.byVeterinarian, p?.byVeterinarian, (r) => ({ key: r.veterinarianUserId ?? '-', name: r.name, count: r.examinationCount, amount: r.netChargeAmount }), cmp)
            },
            c.byLineKind && {
                key: 'line-kinds',
                title: 'Hizmet ve ürün',
                nameLabel: 'Tür',
                countLabel: 'Satır',
                rows: breakdownRows(c.byLineKind, p?.byLineKind, (r) => ({ key: r.lineKind, name: LINE_KIND_LABELS[r.lineKind] ?? r.lineKind, count: r.chargeCount, amount: r.netChargeAmount }), cmp)
            },
            c.topItems && {
                key: 'items',
                title: 'En çok ciro yapan kalemler',
                nameLabel: 'Kalem',
                countLabel: 'Satır',
                rows: breakdownRows(c.topItems, p?.topItems, (r) => ({ key: `${r.lineKind}:${r.description}`, name: r.description, count: r.chargeCount, amount: r.netChargeAmount }), cmp)
            },
            c.bySpecies && {
                key: 'species',
                title: 'Hayvan türü',
                nameLabel: 'Tür',
                countLabel: 'Muayene',
                rows: breakdownRows(c.bySpecies, p?.bySpecies, (r) => ({ key: r.speciesId ?? '-', name: r.name, count: r.examinationCount, amount: r.netChargeAmount }), cmp)
            }
        ];

        return all.filter((t): t is NonNullable<typeof t> => !!t);
    });

    constructor() {
        effect(() => {
            const from = this.from();
            const to = this.to();
            const compare = this.compare();
            const locked = this.planLocked();

            untracked(() => this.load(from, to, compare, locked));
        });
    }

    money(amount: number | null): string {
        return amount == null ? '—' : formatMoney(amount, this.data()?.currency ?? 'TRY', 'tr-TR');
    }

    private load(from: string, to: string, compare: boolean, locked: boolean): void {
        this.request?.unsubscribe();

        if (locked || !from || !to) {
            this.data.set(null);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        const params = new HttpParams().set('from', from).set('to', to).set('compare', String(compare));

        this.request = this.api
            .get<PerformanceBreakdownsDto>(ApiEndpoints.reports.performanceBreakdowns(), params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (d) => {
                    this.data.set(d);
                    this.loading.set(false);
                },
                error: (err: unknown) => {
                    this.loading.set(false);
                    this.error.set(err instanceof HttpErrorResponse ? userErrorFromHttp(err, 'Kırılımlar yüklenemedi.').message : 'Kırılımlar yüklenemedi.');
                }
            });
    }
}
