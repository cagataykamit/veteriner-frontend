import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

const WIDTH = 132;
const HEIGHT = 44;

/** Soru kartındaki küçük eğilim çizgisi (tasarım B): sıfırdan başlayan ölçek, son nokta vurgulu, her noktada değer ipucu. */
@Component({
    selector: 'app-report-hub-sparkline',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg [attr.width]="width" [attr.height]="height" [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="label() + ': ' + values().join(', ')" class="block overflow-visible">
            <polyline [attr.points]="line()" fill="none" stroke="var(--p-primary-color)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            @for (p of points(); track $index) {
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="8" fill="transparent">
                    <title>{{ p.value }}</title>
                </circle>
            }
            @if (points().at(-1); as last) {
                <circle [attr.cx]="last.x" [attr.cy]="last.y" r="4" fill="var(--p-primary-color)" stroke="var(--p-content-background)" stroke-width="2" />
            }
        </svg>
    `
})
export class ReportHubSparklineComponent {
    readonly values = input.required<readonly number[]>();
    readonly label = input('');

    protected readonly width = WIDTH;
    protected readonly height = HEIGHT;

    protected readonly points = computed(() => {
        const vals = this.values();
        const max = Math.max(0, ...vals);
        const step = vals.length > 1 ? WIDTH / (vals.length - 1) : 0;

        return vals.map((value, i) => ({ value, x: round(i * step), y: round(HEIGHT - 4 - (value / (max || 1)) * (HEIGHT - 10)) }));
    });

    protected readonly line = computed(() =>
        this.points()
            .map((p) => `${p.x},${p.y}`)
            .join(' ')
    );
}

function round(n: number): number {
    return Math.round(n * 10) / 10;
}
