import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, computed, effect, inject, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_READ_CLAIM, LAB_RESULTS_READ_CLAIM, PAYMENTS_READ_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { CashSummaryDto, DailyTransactionItemDto, DailyTransactionsResultVm } from '@/app/features/reports/end-of-day/models/end-of-day.model';
import { DailyTransactionsSource, EndOfDayService } from '@/app/features/reports/end-of-day/services/end-of-day.service';
import { DAILY_TRANSACTION_KIND_OPTIONS, DAILY_TRANSACTION_METHOD_OPTIONS, dailyTransactionKindFlag, dailyTransactionKindLabel, dailyTransactionSign, fillEmptyDays } from '@/app/features/reports/end-of-day/utils/end-of-day.utils';
import { dayText } from '@/app/features/reports/registers/data/register-definition';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState, type ReportExtraKey, type ReportListQueryBase } from '@/app/features/reports/shared/report-list-state';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import type { TodayOpenItemsVm } from '@/app/entities/visit/models/visit-vm.model';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatDateTimeDisplay, formatTimeDisplay, formatUtcIsoAsLocalDateTimeDisplay, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';

/** Gövdeye eklenen sınıf: kayıt defterleriyle aynı yazdırma düzeni (üst çubuk, menü gizlenir). */
const PRINT_BODY_CLASS = 'register-page-active';

const EXTRA_KEYS: readonly ReportExtraKey[] = ['kind', 'paymentMethod', 'performedByUserId'];

interface OpenItemRow {
    readonly label: string;
    readonly value: string;
    readonly warn: boolean;
    readonly link?: { readonly route: string; readonly text: string };
}

/**
 * Gün sonu (ADR-017 K8, dilim D6): Rapor Merkezi kartı. Üç uç tek sayfada: günlük işlem dökümü (liste, toplam, dışa aktarma),
 * tahsilat/kasa özeti ve açık işler. Her bölüm kendi okuma iznine bağlıdır; izni olmayan bölüm gizlenir, istek atılmaz.
 */
@Component({
    selector: 'app-end-of-day-page',
    standalone: true,
    imports: [RouterLink, FormsModule, ButtonModule, SelectModule, TableModule, FilterFieldComponent, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, MoneyPipe],
    styleUrl: './end-of-day-page.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="end-of-day-page">
            <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" class="eod-screen-only" title="Gün sonu" description="Günün ücret, tahsilat ve açık işlerini tek yerde görün. Kasa sayımı ve günü kilitleme yoktur." />

            <app-report-filter-bar
                class="eod-screen-only block"
                [state]="state"
                idPrefix="eodRep"
                dateLimit="past"
                periodHint="Tek gün için başlangıç ve bitiş tarihini aynı seçin; varsayılan bugündür. En çok 366 günlük aralık okunur."
                searchPlaceholder=""
                [activeBadges]="false"
            >
                @if (canDaily) {
                    <ng-container ngProjectAs="[extraFilters]">
                        <app-filter-field label="Tür" labelId="eodRepKindLabel" [active]="false" width="select">
                            <p-select
                                ariaLabelledBy="eodRepKindLabel"
                                inputId="eodRepKind"
                                [options]="kindOptions"
                                [ngModel]="state.extraInputs['kind']"
                                (ngModelChange)="setExtra('kind', $event)"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                            />
                        </app-filter-field>
                        <app-filter-field label="Ödeme türü" labelId="eodRepMethodLabel" [active]="false" width="select">
                            <p-select
                                ariaLabelledBy="eodRepMethodLabel"
                                inputId="eodRepMethod"
                                [options]="methodOptions"
                                [ngModel]="state.extraInputs['paymentMethod']"
                                (ngModelChange)="setExtra('paymentMethod', $event)"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                            />
                        </app-filter-field>
                        <app-filter-field label="İşlemi yapan" labelId="eodRepUserLabel" [active]="false" width="select">
                            <p-select
                                ariaLabelledBy="eodRepUserLabel"
                                inputId="eodRepUser"
                                [options]="userOptions()"
                                [ngModel]="state.extraInputs['performedByUserId']"
                                (ngModelChange)="setExtra('performedByUserId', $event)"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                            />
                        </app-filter-field>
                    </ng-container>
                }
                <button pButton type="button" barActions severity="secondary" [outlined]="true" (click)="print()" [disabled]="state.loading()"><i class="p-button-icon pi pi-print"></i>{{ copy.registerPrint }}</button>
            </app-report-filter-bar>

            <div class="eod-print-head">
                <h2 class="eod-print-title">Gün sonu</h2>
                <p class="text-sm text-muted-color">{{ meta() }}</p>
            </div>

            @if (canDaily && state.report(); as r) {
                <section class="card mb-4" aria-labelledby="eodChargesTitle">
                    <h5 id="eodChargesTitle" class="mt-0 mb-3">Ücretler</h5>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                            <span class="block text-muted-color text-sm mb-1">Brüt ücret</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totals.grossChargeAmount | money }}</div>
                        </div>
                        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                            <span class="block text-muted-color text-sm mb-1">İptal edilen ücret</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totals.voidedChargeAmount | money }}</div>
                        </div>
                        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                            <span class="block text-muted-color text-sm mb-1">Net ücret</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totals.netChargeAmount | money }}</div>
                        </div>
                        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                            <span class="block text-muted-color text-sm mb-1">Doğrudan satış ücreti</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totals.salesChargeAmount | money }}</div>
                            <span class="text-xs text-muted-color">Brüt ücrete dahildir.</span>
                        </div>
                    </div>
                    @if (filtersActive()) {
                        <p class="text-xs text-muted-color mt-3 mb-0">Ücret toplamları döküm süzgeçlerine (tür, ödeme türü, işlemi yapan) göre hesaplanır.</p>
                    }
                </section>
            }

            @if (canCash) {
                <section class="card mb-4" aria-labelledby="eodCashTitle">
                    <h5 id="eodCashTitle" class="mt-0 mb-3">Tahsilat</h5>
                    @if (cashError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ cashError() }}</p>
                    } @else if (cash(); as c) {
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <span class="block text-muted-color text-sm mb-1">Tahsilat</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ c.totals.collectedAmount | money }}</div>
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <span class="block text-muted-color text-sm mb-1">İptal edilen tahsilat</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ c.totals.voidedAmount | money }}</div>
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <span class="block text-muted-color text-sm mb-1">Net tahsilat</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ c.totals.netAmount | money }}</div>
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <span class="block text-muted-color text-sm mb-1">Doğrudan satış tahsilatı</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ c.totals.salesCollectedAmount | money }}</div>
                                <span class="text-xs text-muted-color">Tahsilata dahildir.</span>
                            </div>
                        </div>
                        <div class="overflow-x-auto mt-4">
                            <table class="eod-table" aria-label="Ödeme türüne göre tahsilat">
                                <thead>
                                    <tr>
                                        <th>Ödeme türü</th>
                                        <th class="text-right">Tahsilat</th>
                                        <th class="text-right">İptal</th>
                                        <th class="text-right">Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (m of c.byMethod; track m.paymentMethod) {
                                        <tr>
                                            <td>{{ methodLabel(m.paymentMethod) }}</td>
                                            <td class="text-right">{{ m.collectedAmount | money }}</td>
                                            <td class="text-right">{{ m.voidedAmount | money }}</td>
                                            <td class="text-right font-medium">{{ m.netAmount | money }}</td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                        @if (days().length > 1) {
                            <div class="overflow-x-auto mt-4">
                                <table class="eod-table" aria-label="Güne göre tahsilat">
                                    <thead>
                                        <tr>
                                            <th>Gün</th>
                                            <th class="text-right">Tahsilat</th>
                                            <th class="text-right">İptal</th>
                                            <th class="text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (d of days(); track d.date) {
                                            <tr>
                                                <td>{{ dayLabel(d.date) }}</td>
                                                <td class="text-right">{{ d.collectedAmount | money }}</td>
                                                <td class="text-right">{{ d.voidedAmount | money }}</td>
                                                <td class="text-right font-medium">{{ d.netAmount | money }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        }
                    } @else {
                        <p class="text-sm text-muted-color m-0">Tahsilat özeti yükleniyor…</p>
                    }
                </section>
            }

            @if (canOpen && (openItemRows().length > 0 || openItemsNeedClinic() || openError())) {
                <section class="card mb-4" aria-labelledby="eodOpenTitle">
                    <h5 id="eodOpenTitle" class="mt-0 mb-1">Açık işler</h5>
                    @if (isPastRange()) {
                        <p class="text-sm text-muted-color mt-0 mb-3" role="note">Açık işler şu anki durumu gösterir; seçilen günün anlık görüntüsü değildir.</p>
                    }
                    @if (openError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ openError() }}</p>
                    } @else if (openItemsNeedClinic()) {
                        <p class="text-sm text-muted-color m-0">Açık işler tek klinik için hesaplanır. Klinik süzgecinden bir klinik seçin.</p>
                    } @else {
                        <ul class="list-none p-0 m-0 grid grid-cols-12 gap-3">
                            @for (row of openItemRows(); track row.label) {
                                <li class="col-span-12 sm:col-span-6 lg:col-span-3 eod-open-item" [class.eod-open-warn]="row.warn">
                                    <span class="block text-muted-color text-sm mb-1">{{ row.label }}</span>
                                    <span class="font-medium text-xl">{{ row.value }}</span>
                                    @if (row.link) {
                                        <a [routerLink]="row.link.route" class="eod-screen-only block text-primary text-sm no-underline mt-1">{{ row.link.text }}</a>
                                    }
                                </li>
                            }
                        </ul>
                    }
                </section>
            }

            @if (canDaily) {
                <app-report-results [state]="state" [showSummary]="false" [summaryLine]="true" emptyMessage="Bu aralıkta mali hareket yok." emptyHint="Tarih aralığını veya süzgeçleri değiştirip tekrar deneyin.">
                    <ng-template #rows>
                        <div class="overflow-x-auto">
                            <p-table
                                [value]="state.report()?.items ?? []"
                                [paginator]="true"
                                [rows]="state.pageSize()"
                                [rowsPerPageOptions]="state.rowsPerPageOptions"
                                [paginatorDropdownAppendTo]="'body'"
                                [totalRecords]="state.report()?.totalCount ?? 0"
                                [lazy]="true"
                                [first]="state.first()"
                                (onLazyLoad)="state.onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '64rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>{{ multiDay() ? 'Tarih ve saat' : 'Saat' }}</th>
                                        <th>Tür</th>
                                        <th>Müşteri</th>
                                        <th>Hasta</th>
                                        <th class="text-right">Tutar</th>
                                        <th>Ödeme türü</th>
                                        <th>İşlemi yapan</th>
                                        <th>Durum</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr [class.eod-row-voided]="row.isVoided">
                                        <td class="whitespace-nowrap">{{ timeLabel(row.occurredAtUtc) }}</td>
                                        <td>
                                            <span class="eod-kind" [class.eod-kind-void]="flag(row.kind) === 'void'" [class.eod-kind-correction]="flag(row.kind) === 'correction'">{{ kindLabel(row.kind) }}</span>
                                            @if (row.isDirectSale) {
                                                <span class="eod-tag">Satış</span>
                                            }
                                            @if (row.reason) {
                                                <span class="block text-xs text-muted-color">Gerekçe: {{ row.reason }}</span>
                                            } @else if (row.description) {
                                                <span class="block text-xs text-muted-color">{{ row.description }}</span>
                                            }
                                        </td>
                                        <td>
                                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
                                        </td>
                                        <td>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                            } @else {
                                                —
                                            }
                                        </td>
                                        <td class="text-right whitespace-nowrap font-medium">{{ amountLabel(row) }}</td>
                                        <td>{{ row.paymentMethod ? methodLabel(row.paymentMethod) : '—' }}</td>
                                        <td>{{ row.performedByName || '—' }}</td>
                                        <td>{{ row.isVoided ? 'İptal edildi' : 'Geçerli' }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </ng-template>
                </app-report-results>
            }
        </div>
    `
})
export class EndOfDayPageComponent implements OnInit, OnDestroy {
    readonly copy = PANEL_COPY;
    readonly reportsRoute = REPORTS_ROUTE;
    readonly kindOptions = DAILY_TRANSACTION_KIND_OPTIONS;
    readonly methodOptions = DAILY_TRANSACTION_METHOD_OPTIONS;
    readonly kindLabel = dailyTransactionKindLabel;
    readonly flag = dailyTransactionKindFlag;
    readonly methodLabel = paymentMethodLabel;
    readonly money = (n: number) => formatMoney(n, 'TRY');
    readonly dayLabel = dayText;

    private readonly document = inject(DOCUMENT);
    private readonly auth = inject(AuthService);
    private readonly endOfDay = inject(EndOfDayService);

    readonly canCash = this.auth.hasOperationClaim(PAYMENTS_READ_CLAIM);
    readonly canDaily = this.canCash && this.auth.hasOperationClaim(CHARGES_READ_CLAIM);
    readonly canOpen = this.auth.hasOperationClaim(VISITS_READ_CLAIM);

    readonly state = new ReportListState<ReportListQueryBase, DailyTransactionsResultVm>({
        source: inject(DailyTransactionsSource),
        stateKey: 'panel:reports:end-of-day:listState',
        readClaim: [PAYMENTS_READ_CLAIM, CHARGES_READ_CLAIM],
        exportFilePrefix: 'gunluk-islem-dokumu',
        extraKeys: EXTRA_KEYS,
        dateRangeOnly: true,
        todayOnlyByDefault: true,
        rowsPerPageOptions: [25, 50, 100, 200]
    });

    readonly cash = signal<CashSummaryDto | null>(null);
    readonly cashError = signal<string | null>(null);
    readonly openItems = signal<TodayOpenItemsVm | null>(null);
    readonly openItemsNeedClinic = signal(false);
    readonly openError = signal<string | null>(null);
    private summarySeq = 0;

    readonly multiDay = computed(() => this.state.activeFromDate() !== this.state.activeToDate());
    readonly isPastRange = computed(() => !!this.state.activeToDate() && this.state.activeToDate() < localDateYyyyMmDd());
    readonly filtersActive = computed(() => Object.values(this.state.activeExtras()).some((v) => !!v));
    readonly days = computed(() => {
        const c = this.cash();

        return c ? fillEmptyDays(this.state.activeFromDate(), this.state.activeToDate(), c.byDay) : [];
    });

    /** İşlemi yapan süzgeci: tahsilatı veya iptali olan kullanıcılar (kasa özetinden); bilinmeyen kullanıcı satırı seçilemez. */
    readonly userOptions = computed(() => (this.cash()?.byUser ?? []).filter((u) => !!u.userId).map((u) => ({ label: u.userName || '—', value: u.userId as string })));

    /** Açık işler: izni olmayan alan (`null`) satırı hiç oluşturmaz. */
    readonly openItemRows = computed<OpenItemRow[]>(() => {
        const o = this.openItems();

        if (!o) {
            return [];
        }

        const rows: (OpenItemRow | null)[] = [
            o.unchargedVisitCount === null ? null : { label: 'Ücretlenmemiş ziyaret', value: String(o.unchargedVisitCount), warn: o.unchargedVisitCount > 0 },
            o.awaitingLabCount === null
                ? null
                : {
                      label: 'Bekleyen lab',
                      value: String(o.awaitingLabCount),
                      warn: o.awaitingLabCount > 0,
                      link: this.auth.hasOperationClaim(LAB_RESULTS_READ_CLAIM) ? { route: '/panel/lab-results', text: 'Lab sonuçları' } : undefined
                  },
            o.outstandingVisitCount === null
                ? null
                : {
                      label: 'Borçlu çıkan',
                      value: `${o.outstandingVisitCount} ziyaret${o.outstandingAmount === null ? '' : ` · ${this.money(o.outstandingAmount)}`}`,
                      warn: o.outstandingVisitCount > 0,
                      link: this.auth.hasOperationClaim(CHARGES_READ_CLAIM) ? { route: `${REPORTS_ROUTE}/outstanding-balances`, text: 'Borç raporu' } : undefined
                  },
            { label: 'Tamamlanmamış geliş', value: String(o.incompleteVisitCount), warn: o.incompleteVisitCount > 0, link: { route: '/panel/today', text: 'Bugün' } }
        ];

        return rows.filter((r): r is OpenItemRow => r !== null);
    });

    readonly meta = computed(() => {
        const range = this.multiDay() ? `${dayText(this.state.activeFromDate())} – ${dayText(this.state.activeToDate())}` : dayText(this.state.activeFromDate());
        const clinic = this.state.clinicOptions().find((o) => o.value === this.state.activeClinicId())?.label ?? PANEL_COPY.reportsClinicPanelDefault;
        const pages = Math.ceil((this.state.report()?.totalCount ?? 0) / this.state.pageSize());
        const pageNote = pages > 1 ? ` · Döküm sayfa ${this.state.currentPage()} / ${pages}` : '';

        return `${range} · ${PANEL_COPY.reportsFilterClinic}: ${clinic}${pageNote} · ${PANEL_COPY.registerPrintedAt}: ${formatDateTimeDisplay(new Date())}`;
    });

    constructor() {
        // Özet bölümleri döküm süzgeçlerinden değil yalnız tarih ve klinikten beslenir.
        effect(() => {
            const query: ReportListQueryBase = {
                from: this.state.activeFromDate(),
                to: this.state.activeToDate(),
                clinicId: this.state.activeClinicId()
            };

            if (query.from && query.to) {
                untracked(() => this.loadSummaries(query));
            }
        });
    }

    ngOnInit(): void {
        this.document.body.classList.add(PRINT_BODY_CLASS);
        this.state.init();
    }

    ngOnDestroy(): void {
        this.document.body.classList.remove(PRINT_BODY_CLASS);
    }

    setExtra(key: ReportExtraKey, value: string | null): void {
        this.state.extraInputs = { ...this.state.extraInputs, [key]: value ?? '' };
        this.state.scheduleApply();
    }

    timeLabel(utcIso: string): string {
        return this.multiDay() ? formatUtcIsoAsLocalDateTimeDisplay(utcIso) : formatTimeDisplay(utcIso);
    }

    /** Tutar pozitif gelir, yönü tür belirler; düzeltme satırında tutar yoktur. */
    amountLabel(row: DailyTransactionItemDto): string {
        return row.amount == null ? '—' : `${dailyTransactionSign(row.kind)}${this.money(row.amount)}`;
    }

    print(): void {
        window.print();
    }

    private loadSummaries(query: ReportListQueryBase): void {
        const seq = ++this.summarySeq;

        if (this.canCash) {
            this.cash.set(null);
            this.cashError.set(null);
            this.endOfDay.loadCashSummary(query).subscribe({
                next: (res) => seq === this.summarySeq && this.cash.set(res),
                error: (err: unknown) => seq === this.summarySeq && this.cashError.set(panelHttpFailureMessage(err, 'Tahsilat özeti yüklenemedi.'))
            });
        }

        if (this.canOpen) {
            this.openItems.set(null);
            this.openError.set(null);
            this.openItemsNeedClinic.set(false);
            this.endOfDay.loadOpenItems(query).subscribe({
                next: (res) => {
                    if (seq === this.summarySeq) {
                        this.openItems.set(res);
                        this.openItemsNeedClinic.set(res === null);
                    }
                },
                error: (err: unknown) => seq === this.summarySeq && this.openError.set(panelHttpFailureMessage(err, 'Açık işler yüklenemedi.'))
            });
        }
    }
}
