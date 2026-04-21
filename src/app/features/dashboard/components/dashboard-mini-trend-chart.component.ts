import { afterNextRender, Component, effect, inject, input, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';
import { LayoutService } from '@/app/layout/service/layout.service';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Küçük line chart — PrimeNG Chart (Chart.js); dashboard özet trendleri. */
@Component({
    selector: 'app-dashboard-mini-trend-chart',
    standalone: true,
    imports: [ChartModule],
    template: `
        <div class="flex flex-col h-full min-h-[10rem]">
            <span class="block text-muted-color font-medium mb-2 text-sm">{{ title() }}</span>
            <div class="flex-1 relative" style="min-height: 9rem">
                @if (chartData(); as cd) {
                    <p-chart type="line" [data]="cd" [options]="chartOptions()!" class="block h-full w-full" />
                }
            </div>
        </div>
    `
})
export class DashboardMiniTrendChartComponent {
    readonly title = input.required<string>();
    readonly points = input.required<readonly DashboardTrendDayVm[]>();
    readonly valueKind = input<'count' | 'money'>('count');

    private readonly layoutService = inject(LayoutService);

    readonly chartData = signal<Record<string, unknown> | null>(null);
    readonly chartOptions = signal<Record<string, unknown> | null>(null);

    constructor() {
        afterNextRender(() => {
            setTimeout(() => this.refreshChart(), 0);
        });
        effect(() => {
            this.points();
            this.valueKind();
            this.layoutService.layoutConfig().darkTheme;
            setTimeout(() => this.refreshChart(), 0);
        });
    }

    private refreshChart(): void {
        const pts = this.points();
        const kind = this.valueKind();
        const documentStyle = getComputedStyle(document.documentElement);
        const textMuted = documentStyle.getPropertyValue('--text-color-secondary').trim() || '#64748b';
        const borderColor = documentStyle.getPropertyValue('--surface-border').trim() || '#e2e8f0';
        const primary = documentStyle.getPropertyValue('--p-primary-400').trim() || '#3b82f6';

        const rgbaFill = (() => {
            if (primary.startsWith('#') && primary.length === 7) {
                return `${primary}22`;
            }
            return 'rgba(59, 130, 246, 0.12)';
        })();

        this.chartData.set({
            labels: pts.map((p) => p.label),
            datasets: [
                {
                    label: kind === 'money' ? 'Tahsilat' : 'Randevu',
                    data: pts.map((p) => p.value),
                    fill: true,
                    tension: 0.35,
                    borderColor: primary,
                    backgroundColor: rgbaFill,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        });

        const fmtY = (n: number): string => {
            if (kind === 'money') {
                return formatMoney(n, 'TRY', 'tr-TR');
            }
            return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
        };

        this.chartOptions.set({
            maintainAspectRatio: false,
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: { parsed?: { y?: number } }) => {
                            const y = ctx.parsed?.y;
                            if (y == null || Number.isNaN(y)) {
                                return '';
                            }
                            return kind === 'money' ? formatMoney(y, 'TRY') : `${y} randevu`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textMuted,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7,
                        font: { size: 10 }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textMuted,
                        font: { size: 10 },
                        callback: (v: string | number) => {
                            const n = typeof v === 'number' ? v : Number(v);
                            if (Number.isNaN(n)) {
                                return '';
                            }
                            return fmtY(n);
                        }
                    },
                    grid: { color: borderColor }
                }
            }
        });
    }
}
