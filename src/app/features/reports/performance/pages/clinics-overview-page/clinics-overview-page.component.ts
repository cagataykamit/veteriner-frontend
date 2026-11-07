import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import type { ClinicsOverviewDto, ClinicsOverviewLineDto } from '@/app/features/reports/performance/models/clinics-overview.model';
import {
    deltaPercentText,
    PERFORMANCE_PRESET_OPTIONS,
    performanceDelta,
    performancePresetRange,
    ymdToDisplay,
    type PerformancePreset
} from '@/app/features/reports/performance/utils/performance.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Gösterge sütunu; izni olmayan alan toplamda `null` gelir ve sütun çizilmez. */
interface OverviewColumn {
    readonly key: string;
    readonly label: string;
    readonly hint: string;
    readonly money: boolean;
    readonly value: (line: ClinicsOverviewLineDto) => number | null | undefined;
    /** Açık alacak dönemden bağımsızdır; karşılaştırılmaz. */
    readonly previous?: (line: ClinicsOverviewLineDto) => number | null | undefined;
}

export interface OverviewCell {
    readonly key: string;
    readonly label: string;
    readonly text: string;
    readonly deltaText: string | null;
    readonly direction: 'up' | 'down' | 'flat' | null;
}

export interface OverviewRow {
    readonly key: string;
    readonly name: string;
    readonly cells: readonly OverviewCell[];
}

const COLUMNS: readonly OverviewColumn[] = [
    {
        key: 'charges',
        label: 'Ciro',
        hint: 'Dönemde yazılan ücret eksi iptal edilen ücret; gün sonu raporuyla aynı hesap.',
        money: true,
        value: (l) => l.current.netChargeAmount,
        previous: (l) => l.previous?.netChargeAmount
    },
    {
        key: 'cash',
        label: 'Tahsilat',
        hint: 'Alınan ödeme eksi iptal edilen ödeme.',
        money: true,
        value: (l) => l.current.netCollectedAmount,
        previous: (l) => l.previous?.netCollectedAmount
    },
    {
        key: 'outstanding',
        label: 'Açık alacak',
        hint: 'Bugünkü toplam müşteri borcu; seçilen dönemden bağımsızdır.',
        money: true,
        value: (l) => l.outstanding?.totalOutstandingAmount
    },
    { key: 'visits', label: 'Geliş', hint: 'İptal edilmemiş gelişler.', money: false, value: (l) => l.current.visitCount, previous: (l) => l.previous?.visitCount },
    {
        key: 'examinations',
        label: 'Muayene',
        hint: 'Muayene tarihi dönemde olan kayıtlar (taslaklar dahil).',
        money: false,
        value: (l) => l.current.examinationCount,
        previous: (l) => l.previous?.examinationCount
    },
    {
        key: 'appointments',
        label: 'Tamamlanan randevu',
        hint: 'Randevu tarihi dönemde olan ve tamamlanan randevular.',
        money: false,
        value: (l) => l.current.appointments?.completed,
        previous: (l) => l.previous?.appointments?.completed
    }
];

const LOAD_ERROR = 'Şubeler özeti yüklenemedi. Lütfen tekrar deneyin.';

/**
 * Patron ekranı (TIER-007, `CLINICS_OVERVIEW_API_CONTRACT.md`): erişilebilen tüm şubelerin ciro, tahsilat, açık alacak ve iş yükü,
 * toplam ve önceki dönemle. Klinik gönderilmez; panelin aktif kliniği listeyi daraltmaz. Pakette yoksa istek gönderilmez.
 */
@Component({
    selector: 'app-clinics-overview-page',
    standalone: true,
    imports: [NgTemplateOutlet, FormsModule, RouterLink, ButtonModule, SelectModule, ToggleSwitchModule, AppPageHeaderComponent, FilterFieldComponent, DateInputComponent, AppPlanUpgradeNoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './clinics-overview-page.component.html'
})
export class ClinicsOverviewPageComponent {
    private readonly api = inject(ApiClient);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);
    private request: Subscription | null = null;

    readonly presetOptions = PERFORMANCE_PRESET_OPTIONS;
    readonly reportsRoute = REPORTS_ROUTE;
    readonly performanceRoute = `${REPORTS_ROUTE}/performance`;

    readonly preset = signal<PerformancePreset>('thisMonth');
    readonly from = signal(performancePresetRange('thisMonth')!.from);
    readonly to = signal(performancePresetRange('thisMonth')!.to);
    readonly compare = signal(true);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<ClinicsOverviewDto | null>(null);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('ClinicsOverview') !== null);

    readonly columns = computed(() => {
        const total = this.data()?.total;

        return total ? COLUMNS.filter((c) => c.value(total) != null) : [];
    });

    readonly rows = computed<OverviewRow[]>(() => {
        const d = this.data();

        return d ? d.clinics.map((r) => ({ key: r.clinicId, name: r.clinicName, cells: this.cells(r, d.currency) })) : [];
    });

    /** Tek şubede toplam satırın aynısıdır; gösterilmez. */
    readonly totalRow = computed<OverviewRow | null>(() => {
        const d = this.data();

        return d && d.clinics.length > 1 ? { key: 'total', name: 'Toplam', cells: this.cells(d.total, d.currency) } : null;
    });

    readonly displayDate = ymdToDisplay;

    constructor() {
        // Paket bilgisi (access-state) geç gelebilir; kilit değişince yeniden karar verilir.
        effect(() => {
            this.planLocked();
            untracked(() => this.load());
        });
    }

    selectPreset(preset: PerformancePreset): void {
        this.preset.set(preset);
        const range = performancePresetRange(preset);

        if (range) {
            this.from.set(range.from);
            this.to.set(range.to);
            this.load();
        }
    }

    setFrom(value: string): void {
        this.preset.set('custom');
        this.from.set(value);
        this.load();
    }

    setTo(value: string): void {
        this.preset.set('custom');
        this.to.set(value);
        this.load();
    }

    setCompare(value: boolean): void {
        this.compare.set(value);
        this.load();
    }

    load(): void {
        const from = this.from();
        const to = this.to();

        this.request?.unsubscribe();

        if (this.planLocked() || !from || !to) {
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        const params = new HttpParams().set('from', from).set('to', to).set('compare', String(this.compare()));

        this.request = this.api
            .get<ClinicsOverviewDto>(ApiEndpoints.reports.clinicsOverview(), params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data) => {
                    this.data.set(data);
                    this.loading.set(false);
                },
                error: (err: unknown) => {
                    this.loading.set(false);
                    this.error.set(err instanceof HttpErrorResponse ? userErrorFromHttp(err, LOAD_ERROR).message : LOAD_ERROR);
                }
            });
    }

    private cells(line: ClinicsOverviewLineDto, currency: string): OverviewCell[] {
        return this.columns().map((c) => {
            const value = c.value(line) ?? null;
            const delta = c.previous ? performanceDelta(value, c.previous(line)) : null;

            return {
                key: c.key,
                label: c.label,
                text: value == null ? '—' : c.money ? formatMoney(value, currency, 'tr-TR') : value.toLocaleString('tr-TR'),
                deltaText: deltaPercentText(delta),
                direction: delta?.direction ?? null
            };
        });
    }
}
