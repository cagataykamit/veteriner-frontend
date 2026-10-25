import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { firstActionLabel, formatMinutes, formatRate, ONBOARDING_LABELS, type TrialActivationMetricsDto, type TrialOnboarding } from '@/app/features/trial-metrics/models/trial-metrics.model';
import { TrialMetricsService } from '@/app/features/trial-metrics/services/trial-metrics.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

export const TRIAL_METRICS_PERIODS = [7, 30, 90] as const;
export type TrialMetricsPeriodDays = (typeof TRIAL_METRICS_PERIODS)[number];

interface MetricCard {
    readonly testId: string;
    readonly label: string;
    readonly value: string;
    readonly detail: string;
}

/**
 * Platform yöneticisi: deneme aktivasyon özeti (TRIAL-008; `TRIAL_ACTIVATION_METRICS_API_CONTRACT.md`).
 * Kohort = seçilen dönemde deneme başlatan kiracılar; oranların paydası deneme sayısıdır.
 */
@Component({
    selector: 'app-trial-metrics-page',
    standalone: true,
    imports: [ButtonModule, TableModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent],
    template: `
        <app-page-header title="Deneme ölçümleri" description="Dönemde deneme başlatan kliniklerin aktivasyonu ve dönüşümü. Yalnız Vetinity platform yöneticisi görür.">
            <div actions class="flex gap-1" role="group" aria-label="Dönem">
                @for (days of periods; track days) {
                    <button
                        pButton
                        type="button"
                        size="small"
                        [label]="'Son ' + days + ' gün'"
                        [severity]="periodDays() === days ? 'primary' : 'secondary'"
                        [outlined]="periodDays() !== days"
                        [attr.aria-pressed]="periodDays() === days"
                        (click)="selectPeriod(days)"
                        [attr.data-testid]="'tm-period-' + days"
                    ></button>
                }
            </div>
        </app-page-header>

        @if (loading() && !metrics()) {
            <div class="card"><app-loading-state message="Deneme ölçümleri yükleniyor…" /></div>
        } @else if (error()) {
            <div class="card"><app-error-state [detail]="error()!" (retry)="load()" /></div>
        } @else if (metrics(); as m) {
            <p class="text-sm text-muted-color mt-0 mb-3" data-testid="tm-period-text">
                Kohort: {{ periodText() }} içinde deneme başlatan <strong>{{ m.trialStarts }}</strong> klinik.
                @if (m.trialStarts === 0) {
                    <span>Bu dönemde deneme başlatan klinik yok; oranlar boş gösterilir.</span>
                }
            </p>

            <div class="grid grid-cols-12 gap-4 mb-4">
                @for (card of cards(); track card.testId) {
                    <div class="col-span-12 md:col-span-6 xl:col-span-4">
                        <div class="card mb-0 h-full" [attr.data-testid]="card.testId">
                            <div class="text-muted-color text-sm mb-1">{{ card.label }}</div>
                            <div class="text-3xl font-semibold leading-tight" data-testid="tm-card-value">{{ card.value }}</div>
                            <div class="text-sm text-muted-color mt-1">{{ card.detail }}</div>
                        </div>
                    </div>
                }
            </div>

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 xl:col-span-6">
                    <div class="card mb-0 h-full">
                        <h3 class="mt-0 mb-3 text-base font-semibold">Örnek klinik ile boş klinik</h3>
                        <div class="overflow-x-auto">
                            <p-table [value]="m.byOnboarding" dataKey="onboarding">
                                <ng-template #header>
                                    <tr>
                                        <th>Başlangıç</th>
                                        <th class="text-right">Deneme</th>
                                        <th class="text-right">Aktivasyon</th>
                                        <th class="text-right">10 dk içinde</th>
                                        <th class="text-right">Dönüşüm</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr data-testid="tm-onboarding-row">
                                        <td>{{ onboardingLabel(row.onboarding) }}</td>
                                        <td class="text-right">{{ row.trialStarts }}</td>
                                        <td class="text-right">{{ rate(row.activationRate) }}</td>
                                        <td class="text-right">{{ rate(row.within10MinutesRate) }}</td>
                                        <td class="text-right">{{ rate(row.conversionRate) }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card mb-0 h-full">
                        <h3 class="mt-0 mb-3 text-base font-semibold">İlk anlamlı aksiyon</h3>
                        @if (m.firstActionBreakdown.length === 0) {
                            <p class="text-sm text-muted-color m-0" data-testid="tm-breakdown-empty">Bu dönemde aktive olan klinik yok.</p>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table [value]="m.firstActionBreakdown" dataKey="kind">
                                    <ng-template #header>
                                        <tr>
                                            <th>Aksiyon</th>
                                            <th class="text-right">Klinik</th>
                                            <th class="text-right">Aktive olanlar içinde</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-row>
                                        <tr data-testid="tm-breakdown-row">
                                            <td>{{ actionLabel(row.kind) }}</td>
                                            <td class="text-right">{{ row.count }}</td>
                                            <td class="text-right">{{ shareOfActivated(row.count, m) }}</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class TrialMetricsPageComponent implements OnInit {
    private readonly service = inject(TrialMetricsService);

    readonly periods = TRIAL_METRICS_PERIODS;
    readonly periodDays = signal<TrialMetricsPeriodDays>(30);
    readonly metrics = signal<TrialActivationMetricsDto | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly periodText = computed(() => `son ${this.periodDays()} gün`);

    readonly cards = computed<MetricCard[]>(() => {
        const m = this.metrics();

        if (!m) {
            return [];
        }

        return [
            { testId: 'tm-card-starts', label: 'Deneme başlatan', value: String(m.trialStarts), detail: 'Ziyaretçi sayısı üründe yok; oran tanıtım sitesi analitiğiyle hesaplanır.' },
            { testId: 'tm-card-example', label: 'Örnek klinik seçen', value: formatRate(m.exampleClinic.rate), detail: `${m.exampleClinic.count} klinik örnek veriyle başladı.` },
            { testId: 'tm-card-activation', label: 'Aktivasyon', value: formatRate(m.activation.rate), detail: `${m.activation.count} klinik en az bir anlamlı işlem yaptı.` },
            { testId: 'tm-card-quick', label: 'İlk 10 dakikada aktivasyon', value: formatRate(m.activation.within10MinutesRate), detail: `${m.activation.within10MinutesCount} klinik kayıttan sonraki 10 dakikada işlem yaptı.` },
            { testId: 'tm-card-median', label: 'İlk değer anına süre (medyan)', value: formatMinutes(m.activation.medianMinutesToFirstAction), detail: 'Kayıttan ilk anlamlı işleme geçen süre, aktive olan kliniklerde.' },
            { testId: 'tm-card-conversion', label: 'Ücretli plana dönüşüm', value: formatRate(m.conversion.rate), detail: `${m.conversion.count} klinik ücretli plana geçti.` }
        ];
    });

    ngOnInit(): void {
        this.load();
    }

    selectPeriod(days: TrialMetricsPeriodDays): void {
        if (this.periodDays() === days) {
            return;
        }

        this.periodDays.set(days);
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);

        const toUtc = new Date();
        const fromUtc = new Date(toUtc.getTime() - this.periodDays() * 24 * 60 * 60 * 1000);

        this.service.summary(fromUtc.toISOString(), toUtc.toISOString()).subscribe({
            next: (metrics) => {
                this.metrics.set(metrics);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Deneme ölçümleri yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    rate(value: number | null): string {
        return formatRate(value);
    }

    actionLabel(kind: string): string {
        return firstActionLabel(kind);
    }

    onboardingLabel(onboarding: TrialOnboarding): string {
        return ONBOARDING_LABELS[onboarding] ?? onboarding;
    }

    /** Dağılım satırının aktive olan klinikler içindeki payı (sözleşme oran vermez; ekranda türetilir). */
    shareOfActivated(count: number, m: TrialActivationMetricsDto): string {
        return m.activation.count === 0 ? '—' : formatRate(count / m.activation.count);
    }
}
