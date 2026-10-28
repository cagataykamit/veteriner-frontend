import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { DAILY_TRANSACTION_METHOD_OPTIONS, fillEmptyDays } from '@/app/features/reports/end-of-day/utils/end-of-day.utils';
import type { PerformanceSummaryDto } from '@/app/features/reports/performance/models/performance-summary.model';
import { PerformanceSummaryService } from '@/app/features/reports/performance/services/performance-summary.service';
import {
    appointmentRates,
    collectionToChargeRatio,
    formatPercent,
    ymdToDisplay,
    PERFORMANCE_PRESET_OPTIONS,
    performanceDelta,
    performancePresetRange,
    type PerformanceDelta,
    type PerformancePreset
} from '@/app/features/reports/performance/utils/performance.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Gösterge kartı: değer, önceki döneme göre fark, nasıl hesaplandığı ve ayrıntı raporu. */
interface PerformanceKpi {
    readonly key: string;
    readonly label: string;
    readonly value: string;
    readonly delta: PerformanceDelta | null;
    readonly deltaText: string | null;
    readonly hint: string;
    readonly route: string;
}

const LOAD_ERROR = 'Performans özeti yüklenemedi. Lütfen tekrar deneyin.';

/**
 * İşletme performansı (REPORT-008 dilim 1): dönem göstergeleri ve önceki dönemle karşılaştırma. Her sayı ilgili raporun
 * hesabından gelir (tek uç); izni olmayan bölüm çizilmez. Klinik panelin aktif klinik bağlamıdır.
 */
@Component({
    selector: 'app-performance-page',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, SelectModule, ToggleSwitchModule, AppPageHeaderComponent, FilterFieldComponent, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './performance-page.component.html'
})
export class PerformancePageComponent {
    private readonly service = inject(PerformanceSummaryService);
    private readonly destroyRef = inject(DestroyRef);
    private request: Subscription | null = null;

    readonly presetOptions = PERFORMANCE_PRESET_OPTIONS;
    readonly reportsRoute = REPORTS_ROUTE;

    readonly preset = signal<PerformancePreset>('thisMonth');
    readonly from = signal(performancePresetRange('thisMonth')!.from);
    readonly to = signal(performancePresetRange('thisMonth')!.to);
    readonly compare = signal(true);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<PerformanceSummaryDto | null>(null);

    readonly kpis = computed<PerformanceKpi[]>(() => {
        const d = this.data();

        if (!d) {
            return [];
        }

        const cur = d.current;
        const prev = d.previous;
        const kpis: PerformanceKpi[] = [];
        const money = (n: number) => formatMoney(n, d.currency, 'tr-TR');
        const count = (n: number) => n.toLocaleString('tr-TR');

        const add = (key: string, label: string, value: number, previous: number | null | undefined, format: (n: number) => string, hint: string, route: string) => {
            const delta = performanceDelta(value, previous);

            kpis.push({ key, label, value: format(value), delta, deltaText: delta ? deltaLabel(delta, format) : null, hint, route });
        };

        if (cur.charges) {
            add('charges', 'Ciro (net ücret)', cur.charges.netChargeAmount, prev?.charges?.netChargeAmount, money, 'Dönemde yazılan ücret eksi iptal edilen ücret; gün sonu raporuyla aynı hesap.', `${REPORTS_ROUTE}/end-of-day`);
        }

        if (cur.cash) {
            add('cash', 'Net tahsilat', cur.cash.totals.netAmount, prev?.cash?.totals.netAmount, money, 'Alınan ödeme eksi iptal edilen ödeme; ödeme türü ne olursa olsun.', `${REPORTS_ROUTE}/payments`);
        }

        if (d.outstanding) {
            kpis.push({
                key: 'outstanding',
                label: 'Açık alacak (bugün)',
                value: money(d.outstanding.totalOutstandingAmount),
                delta: null,
                deltaText: `${count(d.outstanding.clientCount)} müşteri`,
                hint: 'Bugünkü toplam müşteri borcu; seçilen dönemden bağımsızdır.',
                route: `${REPORTS_ROUTE}/outstanding-balances`
            });
        }

        if (cur.examinationCount != null) {
            add('examinations', 'Muayene', cur.examinationCount, prev?.examinationCount, count, 'Muayene tarihi dönemde olan kayıtlar (taslaklar dahil).', `${REPORTS_ROUTE}/examinations`);
        }

        if (cur.vaccinations) {
            add('vaccinations', 'Uygulanan aşı', cur.vaccinations.applied, prev?.vaccinations?.applied, count, 'Uygulama tarihi dönemde olan aşılar.', `${REPORTS_ROUTE}/vaccinations`);
        }

        if (cur.appointments) {
            add('appointments', 'Tamamlanan randevu', cur.appointments.completed, prev?.appointments?.completed, count, 'Randevu tarihi dönemde olan ve tamamlanan randevular.', `${REPORTS_ROUTE}/appointments`);
        }

        return kpis;
    });

    /** Tahsilat / ciro: iki bölüm de görünürse. */
    readonly collectionRatio = computed(() => {
        const cur = this.data()?.current;

        return cur?.charges && cur.cash ? formatPercent(collectionToChargeRatio(cur.cash.totals.netAmount, cur.charges.netChargeAmount)) : null;
    });

    /** Günlük net tahsilat sütunları; boş günler 0 (yükseklik en büyük güne göre yüzde). */
    readonly trend = computed(() => {
        const d = this.data();
        const cur = d?.current;

        if (!cur?.cash) {
            return [];
        }

        const days = fillEmptyDays(cur.from, cur.to, cur.cash.byDay);
        const max = Math.max(0, ...days.map((day) => day.netAmount));

        return days.map((day) => ({
            date: day.date,
            title: `${day.date.slice(8, 10)}.${day.date.slice(5, 7)}: ${formatMoney(day.netAmount, d!.currency, 'tr-TR')}`,
            height: max > 0 ? Math.max(0, (day.netAmount / max) * 100) : 0
        }));
    });

    readonly methods = computed(() => {
        const d = this.data();
        const byMethod = d?.current.cash?.byMethod ?? [];
        const max = Math.max(0, ...byMethod.map((m) => m.netAmount));

        return byMethod.map((m) => ({
            label: DAILY_TRANSACTION_METHOD_OPTIONS.find((o) => o.value === m.paymentMethod)?.label ?? m.paymentMethod,
            value: formatMoney(m.netAmount, d!.currency, 'tr-TR'),
            width: max > 0 ? Math.max(0, (m.netAmount / max) * 100) : 0
        }));
    });

    readonly appointments = computed(() => {
        const counts = this.data()?.current.appointments;

        return counts ? { counts, ...appointmentRates(counts) } : null;
    });

    readonly users = computed(() => {
        const d = this.data();

        return (d?.current.cash?.byUser ?? []).map((u) => ({ name: u.userName || '—', count: u.collectedCount, value: formatMoney(u.netAmount, d!.currency, 'tr-TR') }));
    });

    readonly isEmpty = computed(() => {
        const cur = this.data()?.current;

        return !!cur && !cur.charges?.grossChargeCount && !cur.cash?.totals.collectedCount && !cur.examinationCount && !cur.appointments?.completed;
    });

    readonly formatPercent = formatPercent;
    readonly displayDate = ymdToDisplay;

    constructor() {
        this.load();
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

        if (!from || !to) {
            return;
        }

        this.request?.unsubscribe();
        this.loading.set(true);
        this.error.set(null);
        this.request = this.service
            .get(from, to, this.compare())
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
}

function deltaLabel(delta: PerformanceDelta, format: (n: number) => string): string {
    const sign = delta.diff > 0 ? '+' : delta.diff < 0 ? '−' : '';
    const amount = `${sign}${format(Math.abs(delta.diff))}`;

    return delta.percent == null ? `${amount} önceki döneme göre` : `${amount} (${formatPercent(Math.abs(delta.percent))}) önceki döneme göre`;
}
