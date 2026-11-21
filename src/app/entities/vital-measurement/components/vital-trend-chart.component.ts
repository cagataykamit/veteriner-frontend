import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import type { VitalPointVm, VitalSignDefinition } from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { niceTicks, timeTicks } from '@/app/entities/vital-measurement/utils/vital-chart.utils';
import { formatVitalValue } from '@/app/entities/vital-measurement/utils/vital-measurement-rules';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

const MARGIN = { left: 44, right: 14, top: 10, bottom: 22 };
const FALLBACK_WIDTH = 480;
const MIN_TICK_GAP = 52;
/** İpucu kutusu kenara bu kadar yakınsa o kenara yaslanır (taşmasın). */
const TIP_EDGE = 80;

/**
 * Tek ölçünün zaman eğilimi (tek eksen). Dört ölçü yan yana dört grafikle gösterilir; ortak zaman ekseni ve
 * gezinilen an (`hoverTime`) üst bileşenden gelir, böylece birinde gezinince hepsinde aynı an işaretlenir.
 * Dolu nokta vital ölçümü, içi boş nokta muayeneden gelen değerdir.
 */
@Component({
    selector: 'app-vital-trend-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block relative' },
    styles: `
        .axis {
            fill: var(--p-text-muted-color);
            font-size: 11px;
            font-variant-numeric: tabular-nums;
        }
    `,
    template: `
        @if (plot(); as p) {
            <svg
                [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
                [attr.height]="height()"
                class="block w-full overflow-visible cursor-pointer"
                style="touch-action: pan-y"
                role="img"
                [attr.aria-label]="sign().label + ' eğilimi, ' + p.dots.length + ' ölçüm'"
                (pointermove)="onPointerMove($event)"
                (pointerleave)="hovered.emit(null)"
                (click)="onClick($event)"
            >
                @for (t of p.yTicks; track t.value) {
                    <line [attr.x1]="p.left" [attr.x2]="p.right" [attr.y1]="t.y" [attr.y2]="t.y" stroke="var(--p-content-border-color)" stroke-width="1" />
                    <text class="axis" [attr.x]="p.left - 6" [attr.y]="t.y + 4" text-anchor="end">{{ t.label }}</text>
                }
                @for (t of p.xTicks; track t.time) {
                    <line [attr.x1]="t.x" [attr.x2]="t.x" [attr.y1]="p.bottom" [attr.y2]="p.bottom + 4" stroke="var(--p-content-border-color)" stroke-width="1" />
                    <text class="axis" [attr.x]="t.x" [attr.y]="height() - 5" text-anchor="middle">{{ t.label }}</text>
                }
                @if (p.crossX !== null) {
                    <line [attr.x1]="p.crossX" [attr.x2]="p.crossX" [attr.y1]="p.top" [attr.y2]="p.bottom" stroke="var(--p-text-muted-color)" stroke-width="1" stroke-dasharray="3 3" data-testid="vital-crosshair" />
                }
                <polyline [attr.points]="p.line" fill="none" stroke="var(--p-primary-color)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                @for (d of p.dots; track d.key) {
                    @if (d.selected) {
                        <circle [attr.cx]="d.x" [attr.cy]="d.y" r="8" fill="none" stroke="var(--p-text-color)" stroke-width="1.5" data-testid="vital-selected-ring" />
                    }
                    <circle
                        [attr.cx]="d.x"
                        [attr.cy]="d.y"
                        r="4"
                        stroke-width="2"
                        [attr.fill]="d.hollow ? 'var(--p-content-background)' : 'var(--p-primary-color)'"
                        [attr.stroke]="d.hollow ? 'var(--p-primary-color)' : 'var(--p-content-background)'"
                        data-testid="vital-dot"
                    />
                }
            </svg>
            @if (p.tip; as tip) {
                <div
                    class="absolute z-10 pointer-events-none rounded-border border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 px-2 py-1 text-xs shadow-md whitespace-nowrap"
                    [style.left.px]="tip.x"
                    [style.top.px]="tip.y"
                    [style.transform]="tip.transform"
                    data-testid="vital-tip"
                >
                    <span class="font-semibold tabular-nums">{{ tip.value }}</span>
                    <span class="text-muted-color tabular-nums"> · {{ tip.when }}</span>
                </div>
            }
        } @else {
            <p class="m-0 py-4 text-sm field-empty" data-testid="vital-chart-empty">Bu aralıkta {{ lowerLabel() }} ölçümü yok.</p>
        }
    `
})
export class VitalTrendChartComponent {
    readonly sign = input.required<VitalSignDefinition>();
    /** Artan zaman sırasında, iptal edilmemiş noktalar; bu ölçüsü boş olanlar çizilmez. */
    readonly points = input.required<readonly VitalPointVm[]>();
    /** Ortak zaman ekseni `[başlangıç, bitiş]` (epoch ms). */
    readonly domain = input.required<readonly [number, number]>();
    readonly selectedKey = input<string | null>(null);
    /** Herhangi bir grafikte gezinilen noktanın zamanı. */
    readonly hoverTime = input<number | null>(null);
    readonly height = input(150);

    /** Gezinilen en yakın noktanın zamanı; imleç çıkınca `null`. */
    readonly hovered = output<number | null>();
    /** Tıklanan en yakın noktanın anahtarı. */
    readonly picked = output<string>();

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    protected readonly width = signal(FALLBACK_WIDTH);

    protected readonly lowerLabel = computed(() => this.sign().label.toLocaleLowerCase('tr'));

    private readonly drawn = computed(() => {
        const key = this.sign().key;

        return this.points().filter((p) => p[key] !== null);
    });

    private readonly scale = computed(() => {
        const pts = this.drawn();

        if (pts.length === 0) {
            return null;
        }

        const key = this.sign().key;
        let [from, to] = this.domain();

        if (to <= from) {
            from -= 3_600_000;
            to += 3_600_000;
        }

        const values = pts.map((p) => p[key] as number);
        const ticks = niceTicks(Math.min(...values), Math.max(...values));
        const low = ticks[0];
        const high = ticks[ticks.length - 1];
        const left = MARGIN.left;
        const right = this.width() - MARGIN.right;
        const top = MARGIN.top;
        const bottom = this.height() - MARGIN.bottom;

        return {
            from,
            to,
            ticks,
            left,
            right,
            top,
            bottom,
            x: (time: number) => round(left + ((time - from) / (to - from)) * (right - left)),
            y: (value: number) => round(top + ((high - value) / (high - low)) * (bottom - top))
        };
    });

    protected readonly plot = computed(() => {
        const s = this.scale();

        if (!s) {
            return null;
        }

        const def = this.sign();
        const selectedKey = this.selectedKey();
        const hoverTime = this.hoverTime();
        const dots = this.drawn().map((p) => ({ key: p.key, time: p.time, value: p[def.key] as number, when: p.measuredAtUtc, x: s.x(p.time), y: s.y(p[def.key] as number), hollow: p.source === 'Examination', selected: p.key === selectedKey }));
        const xTicks: { time: number; x: number; label: string }[] = [];

        for (const t of timeTicks(s.from, s.to)) {
            const x = s.x(t.time);
            const last = xTicks[xTicks.length - 1];

            if ((!last || x - last.x >= MIN_TICK_GAP) && x <= s.right - 4) {
                xTicks.push({ time: t.time, x, label: t.label });
            }
        }

        const hoveredDot = hoverTime === null ? null : (dots.find((d) => d.time === hoverTime) ?? null);

        return {
            left: s.left,
            right: s.right,
            top: s.top,
            bottom: s.bottom,
            yTicks: s.ticks.map((value) => ({ value, y: s.y(value), label: formatVitalValue(def, value) })),
            xTicks,
            line: dots.map((d) => `${d.x},${d.y}`).join(' '),
            dots,
            crossX: hoverTime !== null && hoverTime >= s.from && hoverTime <= s.to ? s.x(hoverTime) : null,
            tip: hoveredDot
                ? {
                      x: hoveredDot.x,
                      y: hoveredDot.y < 44 ? hoveredDot.y + 12 : hoveredDot.y - 36,
                      transform: hoveredDot.x < TIP_EDGE ? 'translateX(-8px)' : hoveredDot.x > s.right - TIP_EDGE ? 'translateX(calc(-100% + 8px))' : 'translateX(-50%)',
                      value: `${formatVitalValue(def, hoveredDot.value)} ${def.unit}`,
                      when: formatUtcIsoAsLocalDateTimeDisplay(hoveredDot.when)
                  }
                : null
        };
    });

    constructor() {
        const destroyRef = inject(DestroyRef);

        // Çizim gerçek piksel genişliğinde yapılır (yazı ölçeklenmesin); test ortamında gözlemci yoksa varsayılan genişlik kalır.
        afterNextRender(() => {
            const el = this.host.nativeElement;

            const measure = () => {
                if (el.clientWidth > 0) {
                    this.width.set(el.clientWidth);
                }
            };

            measure();

            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(measure);

                observer.observe(el);
                destroyRef.onDestroy(() => observer.disconnect());
            }
        });
    }

    protected onPointerMove(event: PointerEvent): void {
        const nearest = this.nearest(event);

        if (nearest && nearest.time !== this.hoverTime()) {
            this.hovered.emit(nearest.time);
        }
    }

    protected onClick(event: MouseEvent): void {
        const nearest = this.nearest(event);

        if (nearest) {
            this.picked.emit(nearest.key);
        }
    }

    /** İmlecin yatay konumuna zamanca en yakın nokta. */
    private nearest(event: MouseEvent): VitalPointVm | null {
        const s = this.scale();
        const svg = event.currentTarget as SVGElement | null;
        const rect = svg?.getBoundingClientRect();

        if (!s || !rect || rect.width === 0) {
            return null;
        }

        const x = ((event.clientX - rect.left) / rect.width) * this.width();
        const time = s.from + ((x - s.left) / (s.right - s.left)) * (s.to - s.from);

        return this.drawn().reduce<VitalPointVm | null>((best, p) => (best === null || Math.abs(p.time - time) < Math.abs(best.time - time) ? p : best), null);
    }
}

function round(n: number): number {
    return Math.round(n * 10) / 10;
}
