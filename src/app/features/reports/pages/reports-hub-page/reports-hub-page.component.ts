import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { CardEntry } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ReportHubSparklineComponent } from '@/app/features/reports/hub/components/report-hub-sparkline.component';
import { attentionRows, type FigurePart, reportMatches, visibleQuestions, visibleReports } from '@/app/features/reports/hub/data/report-hub.rules';
import type { ReportHubPeriod, ReportHubSummaryDto } from '@/app/features/reports/hub/models/report-hub-summary.model';
import { ReportHubSummaryService } from '@/app/features/reports/hub/services/report-hub-summary.service';
import { ReportPreferencesService, reportKeyFromRoute } from '@/app/features/reports/shared/report-preferences.service';
import { PANEL_COPY, REPORT_HUB_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

const PERIODS: readonly ReportHubPeriod[] = ['today', 'week', 'month'];

/**
 * Rapor Merkezi ana ekranı (ADR-003, ADR-052; tasarım B · Sorular): raporlar iş sorularının altında, her soruda özet sayı ve eğilim,
 * üstte "Bakmanız gerekenler" bandı ve favoriler (REPORT-003). Sayılar seçili şubeye göre tek uçtan gelir; görünürlük kuralı
 * `report-hub.rules.ts`'dedir (izni olmayan kart ve sıfır sayılı uyarı çizilmez). Özet yüklenemezse rapor bağlantıları yine çalışır.
 */
@Component({
    selector: 'app-reports-hub-page',
    standalone: true,
    imports: [AppPageHeaderComponent, RouterLink, FormsModule, InputTextModule, ReportHubSparklineComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Raporlar" [description]="hub.pageDescription">
            <div actions class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div class="inline-flex w-full sm:w-auto rounded-lg border border-surface bg-surface-50 dark:bg-surface-800 p-0.5" role="group" [attr.aria-label]="hub.periodGroupLabel">
                    @for (p of periods; track p) {
                        <button
                            type="button"
                            class="flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer border-0 touch:min-h-(--touch-target)"
                            [class]="period() === p ? 'bg-surface-0 dark:bg-surface-900 text-color shadow-sm' : 'bg-transparent text-muted-color hover:text-color'"
                            [attr.aria-pressed]="period() === p"
                            [attr.data-testid]="'period-' + p"
                            (click)="setPeriod(p)"
                        >
                            {{ hub.periods[p] }}
                        </button>
                    }
                </div>
                <span class="relative w-full sm:w-60">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm pointer-events-none" aria-hidden="true"></i>
                    <input
                        pInputText
                        type="search"
                        class="w-full !pl-9"
                        [placeholder]="hub.searchPlaceholder"
                        [attr.aria-label]="hub.searchPlaceholder"
                        autocomplete="off"
                        data-testid="report-search"
                        [ngModel]="query()"
                        (ngModelChange)="query.set($event)"
                    />
                </span>
            </div>
        </app-page-header>

        @if (favoriteError(); as message) {
            <p class="text-danger text-sm mt-0 mb-3" role="alert">{{ message }}</p>
        }

        <div class="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-color" data-testid="favorites-section">
            @if (favoriteEntries().length > 0) {
                <span><i class="pi pi-star-fill text-amber-500 mr-1" aria-hidden="true"></i>{{ hub.favoritesLabel }}</span>
                @for (f of favoriteEntries(); track f.route) {
                    <a
                        [routerLink]="f.route"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 text-color font-medium no-underline hover:border-primary touch:min-h-(--touch-target)"
                        data-testid="favorite-link"
                    >
                        <i [class]="f.icon + ' text-primary text-xs'" aria-hidden="true"></i>{{ f.label }}
                    </a>
                }
            } @else {
                <span>{{ hub.favoritesEmpty }}</span>
            }
        </div>

        @if (loadError()) {
            <p class="text-muted-color text-sm mt-0 mb-4" role="status" data-testid="hub-load-error"><i class="pi pi-info-circle mr-1" aria-hidden="true"></i>{{ hub.loadError }}</p>
        }

        @if (attention().length > 0) {
            <section class="card !mb-5 !p-0 border-l-[3px] !border-l-amber-500 py-1" aria-labelledby="attention-title" data-testid="attention-band">
                <h2 id="attention-title" class="m-0 px-4 pt-2.5 pb-1.5 text-sm font-semibold flex items-center gap-2"><i class="pi pi-exclamation-circle text-amber-600 dark:text-amber-400" aria-hidden="true"></i>{{ hub.attention.title }}</h2>
                @for (row of attention(); track row.key; let first = $first) {
                    <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-2" [class.border-t]="!first" [class.border-surface]="!first" [attr.data-testid]="'attention-' + row.key">
                        <!-- Telefonda metin satırın kalanını alır, düğme alta iner ve metinle hizalanır (sayı 2.75rem + boşluk 0.75rem = ml-14). -->
                        <span class="w-11 shrink-0 text-xl font-semibold text-right tabular-nums text-amber-700 dark:text-amber-400">{{ row.count }}</span>
                        <span class="grow min-w-0 basis-[calc(100%-3.5rem)] sm:basis-0">
                            <span class="font-medium">{{ row.text }}</span>
                            <small class="block text-muted-color text-[12.5px]">{{ row.hint }}</small>
                        </span>
                        <a
                            [routerLink]="row.route"
                            [queryParams]="row.queryParams ?? null"
                            class="ml-14 sm:ml-0 inline-flex items-center h-[30px] px-2.5 rounded-lg border border-surface text-sm font-medium text-color no-underline whitespace-nowrap hover:bg-emphasis touch:min-h-(--touch-target)"
                            >{{ row.action }}</a
                        >
                    </div>
                }
            </section>
        }

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 transition-opacity" [class.opacity-60]="loading() && summary()" [attr.aria-busy]="loading()" data-testid="question-grid">
            @for (q of questions(); track q.id) {
                @let hit = isHit(q.reports);
                <section
                    class="card !mb-0 !p-4 md:!px-[18px] md:!pt-[18px] md:!pb-2.5 flex flex-col min-w-0 transition-opacity"
                    [class.opacity-35]="query().trim() && !hit"
                    [class.ring-2]="hit"
                    [class.ring-primary]="hit"
                    [attr.aria-labelledby]="'q-' + q.id"
                    [attr.data-testid]="'question-' + q.id"
                >
                    <div class="flex items-start justify-between gap-3">
                        <h3 [id]="'q-' + q.id" class="m-0 text-base font-semibold leading-[22px]">{{ q.title }}</h3>
                        <span class="inline-flex items-center gap-1 h-5 px-[7px] rounded-md text-[11.5px] font-medium bg-emphasis text-muted-color whitespace-nowrap"><i class="pi pi-clock text-[10px]" aria-hidden="true"></i>{{ q.cadence }}</span>
                    </div>

                    @if (q.figure; as f) {
                        <div class="flex flex-col md:flex-row md:items-end justify-between gap-2.5 md:gap-4 mt-3.5 mb-3 min-h-14">
                            <div>
                                <div class="text-[28px] font-semibold leading-tight tabular-nums" data-testid="figure-value">
                                    {{ f.value }}<small class="ml-1 text-sm font-medium text-muted-color">{{ f.unit }}</small>
                                </div>
                                <div class="mt-1 text-[13px] text-muted-color" data-testid="figure-sub">
                                    @if (f.when) {
                                        <span>{{ f.when }}{{ f.parts.length ? ' · ' : '' }}</span>
                                    }
                                    @for (part of f.parts; track $index) {
                                        <span [class]="toneClass(part.tone)">{{ part.text }}</span>
                                    }
                                </div>
                            </div>
                            @if (f.spark; as spark) {
                                @if (spark.length > 1) {
                                    <app-report-hub-sparkline class="shrink-0" [values]="spark" [label]="hub.figures.trend" />
                                }
                            } @else if (f.split; as split) {
                                <div class="w-full md:w-[210px] shrink-0">
                                    <div class="flex gap-0.5 h-2.5 rounded overflow-hidden" role="img" [attr.aria-label]="hub.figures.split + ': ' + splitLabel(split)">
                                        @for (s of split; track s.label; let i = $index) {
                                            <span class="bg-primary" [style.width.%]="s.percent" [style.opacity]="1 - i * 0.3" [title]="s.label + ' %' + s.percent"></span>
                                        }
                                    </div>
                                    <div class="flex justify-between mt-1.5 text-xs text-muted-color">
                                        @for (s of split; track s.label) {
                                            <span
                                                >{{ s.label }} <b class="text-color font-semibold">%{{ s.percent }}</b></span
                                            >
                                        }
                                    </div>
                                </div>
                            }
                        </div>
                    } @else {
                        <div class="mt-3"></div>
                    }

                    <div class="-mx-2 mt-auto pt-1.5 border-t border-surface" [class]="q.id === 'registers' ? 'grid md:grid-cols-2 gap-x-2' : ''">
                        @for (r of q.reports; track r.route) {
                            @let fav = favoriteRoutes().has(r.route);
                            <div class="group flex items-center gap-2.5 px-2 py-[7px] rounded-lg hover:bg-emphasis" [class.ring-1]="query().trim() && matches(r)" [class.ring-primary]="query().trim() && matches(r)">
                                <a [routerLink]="r.route" class="flex flex-1 min-w-0 items-center gap-2.5 no-underline text-color touch:min-h-(--touch-target)" data-testid="report-link">
                                    <span class="w-7 h-7 shrink-0 rounded-lg grid place-items-center bg-primary-50 dark:bg-primary-950 text-primary text-[12.5px]"><i [class]="r.icon" aria-hidden="true"></i></span>
                                    <span class="flex-1 min-w-0">
                                        <span class="flex items-center gap-1.5 font-medium text-sm">
                                            {{ r.label }}
                                            @if (ro.planLockHint(r.planFeature); as hint) {
                                                <span class="inline-flex items-center gap-1 text-xs font-normal text-muted-color whitespace-nowrap" data-testid="plan-lock-hint"><i class="pi pi-lock text-xs" aria-hidden="true"></i>{{ hint }}</span>
                                            }
                                        </span>
                                        @if (q.id !== 'registers') {
                                            <span class="block text-[12.5px] leading-[17px] text-muted-color">{{ r.description }}</span>
                                        }
                                    </span>
                                </a>
                                <button
                                    type="button"
                                    class="touch:touch-hit w-[26px] h-[26px] shrink-0 grid place-items-center rounded-lg border-0 bg-transparent cursor-pointer hover:bg-emphasis"
                                    [class]="fav ? 'text-amber-500' : 'text-muted-color opacity-0 group-hover:opacity-100 focus-visible:opacity-100 touch:opacity-100'"
                                    [attr.aria-pressed]="fav"
                                    [attr.aria-label]="(fav ? copy.reportsFavoriteRemove : copy.reportsFavoriteAdd) + ': ' + r.label"
                                    [title]="fav ? copy.reportsFavoriteRemove : copy.reportsFavoriteAdd"
                                    data-testid="favorite-toggle"
                                    (click)="toggleFavorite(r.route)"
                                >
                                    <i [class]="fav ? 'pi pi-star-fill' : 'pi pi-star'" aria-hidden="true"></i>
                                </button>
                                <i class="pi pi-chevron-right text-xs text-muted-color" aria-hidden="true"></i>
                            </div>
                        }
                    </div>
                </section>
            }
        </div>
    `
})
export class ReportsHubPageComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly preferences = inject(ReportPreferencesService);
    private readonly summaryService = inject(ReportHubSummaryService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly hub = REPORT_HUB_COPY;
    readonly periods = PERIODS;

    private readonly hasClaim = (claim: string) => this.auth.hasOperationClaim(claim);
    private readonly reports: readonly CardEntry[] = visibleReports(this.hasClaim);

    readonly period = signal<ReportHubPeriod>('week');
    readonly query = signal('');
    readonly summary = signal<ReportHubSummaryDto | null>(null);
    readonly loadError = signal(false);
    /** Yeni dönemin sayıları yüklenirken kartlar soluk; eski sayılar yeni dönemin adıyla görünmez. */
    readonly loading = signal(true);

    /** Etiketler gelen yanıtın dönemine bağlıdır: dönem değişip yanıt gelmeden kart eski dönemin adıyla kalır. */
    readonly questions = computed(() => visibleQuestions(this.reports, this.summary(), this.summary()?.period ?? this.period()));
    readonly attention = computed(() => attentionRows(this.summary(), this.hasClaim));

    /** Favori rapor anahtarları, eklenme sırasıyla (sunucu sırası; yeni eklenen sona). */
    readonly favoriteKeys = signal<readonly string[]>([]);
    readonly favoriteError = signal<string | null>(null);

    readonly favoriteEntries = computed(() => this.favoriteKeys().flatMap((key) => this.reports.filter((e) => reportKeyFromRoute(e.route) === key)));
    readonly favoriteRoutes = computed<ReadonlySet<string>>(() => new Set(this.favoriteEntries().map((e) => e.route)));

    private readonly load$ = new Subject<ReportHubPeriod>();

    ngOnInit(): void {
        this.preferences.listFavoriteKeys().subscribe({
            next: (keys) => this.favoriteKeys.set(keys),
            error: () => this.favoriteKeys.set([])
        });

        // Dönem hızlı değişirse yalnız son isteğin cevabı yazılır.
        this.load$
            .pipe(
                switchMap((period) =>
                    this.summaryService.get(period).pipe(
                        catchError(() => {
                            this.loadError.set(true);

                            return of(null);
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((summary) => {
                if (summary) {
                    this.loadError.set(false);
                }

                this.summary.set(summary);
                this.loading.set(false);
            });

        this.load$.next(this.period());
    }

    setPeriod(period: ReportHubPeriod): void {
        if (period !== this.period()) {
            this.period.set(period);
            this.loading.set(true);
            this.load$.next(period);
        }
    }

    matches(report: CardEntry): boolean {
        return reportMatches(report, this.query());
    }

    isHit(reports: readonly CardEntry[]): boolean {
        return !!this.query().trim() && reports.some((r) => this.matches(r));
    }

    toneClass(tone: FigurePart['tone']): string {
        switch (tone) {
            case 'warn':
                return 'font-semibold text-amber-700 dark:text-amber-400';
            case 'up':
                return 'font-semibold text-primary';
            case 'down':
                return 'font-semibold text-red-700 dark:text-red-400';
            default:
                return '';
        }
    }

    splitLabel(split: readonly { label: string; percent: number }[]): string {
        return split.map((s) => `${s.label} %${s.percent}`).join(', ');
    }

    /** İyimser güncelleme: yıldız hemen değişir, istek başarısızsa önceki duruma döner ve uyarı gösterilir. */
    toggleFavorite(route: string): void {
        const key = reportKeyFromRoute(route);

        if (!key) {
            return;
        }

        const before = this.favoriteKeys();
        const isFavorite = before.includes(key);

        this.favoriteError.set(null);
        this.favoriteKeys.set(isFavorite ? before.filter((k) => k !== key) : [...before, key]);

        (isFavorite ? this.preferences.removeFavorite(key) : this.preferences.addFavorite(key)).subscribe({
            error: () => {
                this.favoriteKeys.set(before);
                this.favoriteError.set(PANEL_COPY.reportsFavoriteSaveFailed);
            }
        });
    }
}
