import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, fromEvent, map, take } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DashboardMiniTrendChartComponent } from '@/app/features/dashboard/components/dashboard-mini-trend-chart.component';
import type { DashboardOperationalVm } from '@/app/features/dashboard/models/dashboard-operational.model';
import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';
import { buildSevenDayTrendPoints } from '@/app/features/dashboard/utils/dashboard-trend.utils';
import { DashboardService, dashboardVmWithPendingLists, mergeDashboardListPhaseIntoVm } from '@/app/features/dashboard/services/dashboard.service';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/entities/appointment/utils/appointment-status.utils';
import { paymentMethodLabel } from '@/app/entities/payment/utils/payment-method.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { singleDayAppointmentsLinkQuery } from '@/app/entities/appointment/utils/appointments-list-link.utils';
import { upcomingVaccinationsFilters, vaccinationsListLinkQuery } from '@/app/entities/vaccination/utils/vaccinations-list-link.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { DashboardRecentPetDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardActionSeverity } from '@/app/features/dashboard/models/dashboard-operational-alerts.model';
import { PRODUCTS_READ_CLAIM, VISITS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitArrivalDialogComponent } from '@/app/entities/visit/components/visit-arrival-dialog.component';
import { AuthService } from '@/app/core/auth/auth.service';
import { panelReturnUrlOrDefault } from '@/app/core/auth/auth-return-url.utils';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import { ProductStockService } from '@/app/entities/inventory/services/product-stock.service';
import { TrDatePipe, TrDateTimePipe, TrTimePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        DashboardMiniTrendChartComponent,
        VisitArrivalDialogComponent,
        TrDatePipe,
        TrDateTimePipe,
        TrTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent implements OnInit, AfterViewInit {
    private readonly dashboardService = inject(DashboardService);
    private readonly productStockService = inject(ProductStockService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly belowFoldTriggerEl = viewChild<ElementRef<HTMLElement>>('belowFoldTrigger');
    private belowFoldObserver: IntersectionObserver | null = null;
    private belowFoldSetupTimer: ReturnType<typeof setTimeout> | null = null;
    private summariesLoadingInFlight = false;

    readonly copy = PANEL_COPY;
    /** "Bugünkü randevular" kartıyla aynı küme: bugünün (kartın sorgusuyla aynı gün) bütün durumları. */
    readonly todayAppointmentsLinkQuery = singleDayAppointmentsLinkQuery(localDateYyyyMmDd());
    /** "Yaklaşan aşılar" kartının sorgusuyla aynı tanım: planlı, bugünden itibaren, vefat edenler hariç. */
    readonly upcomingVaccinationsLinkQuery = vaccinationsListLinkQuery(upcomingVaccinationsFilters());
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;

    readonly loading = signal(true);
    /** Faz 2: randevu / aşı / muayene listeleri gelene kadar. */
    readonly listsLoading = signal(false);
    readonly dash = signal<DashboardOperationalVm | null>(null);
    readonly belowFoldRequested = signal(false);
    readonly belowFoldLoading = signal(false);
    readonly belowFoldLoaded = signal(false);
    readonly belowFoldError = signal<string | null>(null);

    readonly canReadProducts = this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM);
    readonly lowStockRows = signal<ProductStockVm[]>([]);
    readonly lowStockLoading = signal(false);
    readonly lowStockError = signal<string | null>(null);

    /** Uyarı alanı: yalnızca yükleme, hata veya en az bir düşük stok satırı varken gösterilir. */
    readonly showLowStockCard = computed(() => this.canReadProducts && (this.lowStockLoading() || this.lowStockError() != null || this.lowStockRows().length > 0));

    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly apptStatusLabel = appointmentStatusLabel;
    readonly apptStatusSeverity = appointmentStatusSeverity;
    readonly payMethodLabel = paymentMethodLabel;

    /** Guard dışı kenar durumlarında sonsuz yükleme göstermemek için. */
    readonly clinicContextOk = signal(false);

    readonly selectClinicQueryParams = { returnUrl: panelReturnUrlOrDefault(this.router.url) };

    ngOnInit(): void {
        const ok = this.auth.hasSelectedClinic();

        this.clinicContextOk.set(ok);

        if (!ok) {
            this.loading.set(false);
            this.listsLoading.set(false);
            this.dash.set(null);
            this.resetLowStockState();

            return;
        }

        this.reload();

        if (typeof window !== 'undefined') {
            fromEvent(window, 'scroll')
                .pipe(take(1), takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.requestBelowFoldOnce();
                });
        }

        this.destroyRef.onDestroy(() => {
            this.disconnectBelowFoldObserver();
            this.clearBelowFoldSetupTimer();
        });
    }

    ngAfterViewInit(): void {
        this.scheduleBelowFoldObserverSetup();
    }

    pageDescription(): string {
        if (!this.clinicContextOk()) {
            return this.copy.dashboardNeedClinicHint;
        }

        const label = this.auth.activeClinicLabel()?.trim();
        const who = label ? label : 'Seçili klinik';

        return `${who} için günlük operasyon durumu, yaklaşan takipler ve kritik uyarılar.`;
    }

    reload(): void {
        if (!this.clinicContextOk()) {
            return;
        }

        if (this.summariesLoadingInFlight) {
            return;
        }

        this.summariesLoadingInFlight = true;
        this.resetBelowFoldStateForReload();
        this.loading.set(true);
        this.dashboardService.loadDashboardSummariesPhase().subscribe({
            next: (summaries) => {
                this.dash.set(dashboardVmWithPendingLists(summaries));
                this.loading.set(false);
                this.summariesLoadingInFlight = false;
                this.loadLowStockIfAllowed();

                if (this.belowFoldRequested() && !this.belowFoldLoaded()) {
                    this.requestBelowFoldOnce();
                }

                this.scheduleBelowFoldObserverSetup();
            },
            error: () => {
                this.loading.set(false);
                this.summariesLoadingInFlight = false;
                this.setBelowFoldLoading(false);
            }
        });
    }

    metricCount(n: number | null | undefined): string | number {
        if (n === undefined || n === null) {
            return '—';
        }

        return n;
    }

    appointmentTrendPoints(d: DashboardOperationalVm): readonly DashboardTrendDayVm[] {
        return d.summary.data?.last7DaysAppointmentsTrend ?? buildSevenDayTrendPoints([]);
    }

    paidTrendPoints(d: DashboardOperationalVm): readonly DashboardTrendDayVm[] {
        return d.finance.data?.last7DaysPaidTrend ?? buildSevenDayTrendPoints([]);
    }

    canViewFinance(d: DashboardOperationalVm): boolean {
        return d.canViewFinance;
    }

    canShowPaymentsQuickAction(): boolean {
        const d = this.dash();

        if (d) {
            return d.canViewFinance;
        }

        return this.auth.hasOperationClaim('Payments.Read');
    }

    /** Randevusuz geliş Bugün sayfasıyla aynı kuralla (`Visits.Create`) sunulur; kaydedilen geliş Bugün kuyruğunda görünür. */
    readonly canCreateVisit = this.auth.hasOperationClaim(VISITS_CREATE_CLAIM);
    readonly walkInOpen = signal(false);

    onWalkInArrived(): void {
        void this.router.navigate(['/panel/today']);
    }

    canOpenAppointments(): boolean {
        return this.hasAnyClaim('Appointments.Read', 'Appointments.Create');
    }

    canOpenClients(): boolean {
        return this.hasAnyClaim('Clients.Read');
    }

    canOpenPets(): boolean {
        return this.hasAnyClaim('Pets.Read');
    }

    severityLabel(severity: DashboardActionSeverity): string {
        if (severity === 'danger') {
            return 'Kritik';
        }

        if (severity === 'warning') {
            return 'Dikkat';
        }

        return 'Bilgi';
    }

    statusSeverity(severity: DashboardActionSeverity): StatusTagSeverity {
        if (severity === 'warning') {
            return 'warn';
        }

        return severity;
    }

    hasTopRightOperationalPanel(d: DashboardOperationalVm): boolean {
        return d.alerts.length > 0 || (d.canViewOperationalAlerts && d.actionItems.length > 0) || !!d.capabilities.error || !!d.operationalAlerts.error;
    }

    todayAppointmentsMetric(d: DashboardOperationalVm): number | null {
        if (!this.belowFoldLoaded()) {
            return d.summary.data?.todayAppointmentsCount ?? null;
        }

        // "Bugünkü randevular" kartı ve tablosu aynı kavramı göstersin:
        // öncelik tablo verisi (aynı source/filter), fallback summary sayacı.
        if (!d.todayAppointments.error) {
            return d.todayAppointments.data.length;
        }

        return d.summary.data?.todayAppointmentsCount ?? null;
    }

    money(amount: number | null, currency: string | null | undefined): string {
        return formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    }

    /** Dashboard finans kartları — backend toplamları TRY (İstanbul) varsayımı. */
    financeMoney(amount: number | null): string {
        return formatMoney(amount, 'TRY');
    }

    petSpeciesText(row: DashboardRecentPetDto): string {
        const species = row.speciesName?.trim() || row.species?.trim() || '-';
        const breed = row.breedName?.trim() || row.breed?.trim() || '';

        return breed ? `${species} · ${breed}` : species;
    }

    private hasAnyClaim(...claims: readonly string[]): boolean {
        const d = this.dash();

        if (d?.capabilities.data.isOwner || d?.capabilities.data.isAdmin) {
            return true;
        }

        return claims.some((claim) => this.auth.hasOperationClaim(claim));
    }

    requestBelowFoldOnce(): void {
        if (this.belowFoldLoaded() || this.belowFoldLoading()) {
            return;
        }

        this.belowFoldRequested.set(true);
        this.belowFoldError.set(null);
        this.disconnectBelowFoldObserver();

        if (this.summariesLoadingInFlight || this.loading()) {
            return;
        }

        const current = this.dash();

        if (!current) {
            return;
        }

        this.loadBelowFoldData({
            summary: current.summary,
            capabilities: current.capabilities,
            operationalAlerts: current.operationalAlerts,
            actionItems: current.actionItems,
            alerts: current.alerts,
            canViewFinance: current.canViewFinance,
            canViewOperationalAlerts: current.canViewOperationalAlerts,
            finance: current.finance
        });
    }

    onManualBelowFoldLoad(): void {
        this.requestBelowFoldOnce();
    }

    private loadBelowFoldData(summaries: Parameters<typeof mergeDashboardListPhaseIntoVm>[0]): void {
        if (this.belowFoldLoaded() || this.belowFoldLoading()) {
            return;
        }

        this.setBelowFoldLoading(true);
        forkJoin({
            lists: this.dashboardService.loadDashboardListsPhase(),
            finance: this.dashboardService.loadDashboardFinancePhase(summaries.canViewFinance)
        })
            .pipe(map(({ lists, finance }) => ({ ...mergeDashboardListPhaseIntoVm(summaries, lists), finance })))
            .subscribe({
                next: (full) => {
                    this.dash.set(full);
                    this.belowFoldLoaded.set(true);
                    this.belowFoldError.set(null);
                    this.setBelowFoldLoading(false);
                },
                error: () => {
                    this.belowFoldError.set('Detaylar yüklenemedi.');
                    this.setBelowFoldLoading(false);
                }
            });
    }

    private setupBelowFoldObserver(): void {
        if (this.belowFoldLoaded()) {
            return;
        }

        if (typeof window === 'undefined') {
            this.requestBelowFoldOnce();

            return;
        }

        const el = this.belowFoldTriggerEl()?.nativeElement ?? null;

        if (!el) {
            return;
        }

        const preloadMarginPx = 300;

        if (el.getBoundingClientRect().top <= window.innerHeight + preloadMarginPx) {
            this.requestBelowFoldOnce();

            return;
        }

        if (typeof IntersectionObserver === 'undefined') {
            this.requestBelowFoldOnce();

            return;
        }

        this.disconnectBelowFoldObserver();
        this.belowFoldObserver = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    this.requestBelowFoldOnce();
                }
            },
            { root: null, rootMargin: '300px 0px', threshold: 0.01 }
        );
        this.belowFoldObserver.observe(el);
    }

    private disconnectBelowFoldObserver(): void {
        if (this.belowFoldObserver) {
            this.belowFoldObserver.disconnect();
            this.belowFoldObserver = null;
        }
    }

    private setBelowFoldLoading(value: boolean): void {
        this.belowFoldLoading.set(value);
        this.listsLoading.set(value);
    }

    private resetBelowFoldStateForReload(): void {
        this.disconnectBelowFoldObserver();
        this.clearBelowFoldSetupTimer();
        this.belowFoldRequested.set(false);
        this.belowFoldLoaded.set(false);
        this.belowFoldError.set(null);
        this.setBelowFoldLoading(false);
    }

    private scheduleBelowFoldObserverSetup(): void {
        if (typeof window === 'undefined') {
            return;
        }

        this.clearBelowFoldSetupTimer();
        this.belowFoldSetupTimer = setTimeout(() => {
            this.belowFoldSetupTimer = null;
            this.setupBelowFoldObserver();
        }, 0);
    }

    private clearBelowFoldSetupTimer(): void {
        if (this.belowFoldSetupTimer !== null) {
            clearTimeout(this.belowFoldSetupTimer);
            this.belowFoldSetupTimer = null;
        }
    }

    private resetLowStockState(): void {
        this.lowStockRows.set([]);
        this.lowStockLoading.set(false);
        this.lowStockError.set(null);
    }

    private loadLowStockIfAllowed(): void {
        if (!this.clinicContextOk() || !this.canReadProducts) {
            this.resetLowStockState();

            return;
        }

        this.lowStockLoading.set(true);
        this.lowStockError.set(null);
        this.productStockService.list({ page: 1, pageSize: 5, isBelowMinimum: true }).subscribe({
            next: (r) => {
                this.lowStockRows.set(r.items);
                this.lowStockLoading.set(false);
            },
            error: () => {
                this.lowStockError.set('Düşük stok bilgileri yüklenemedi.');
                this.lowStockLoading.set(false);
            }
        });
    }
}
