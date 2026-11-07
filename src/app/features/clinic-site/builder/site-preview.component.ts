import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { type SectionType, type SiteConfig, SiteRendererComponent } from '@site-engine';
import type { DeviceKey } from '@/app/features/clinic-site/builder/site-builder.store';

const WIDTHS: Readonly<Record<DeviceKey, number>> = { masaustu: 1280, tablet: 820, mobil: 375 };

/**
 * Canlı önizleme: yayınlanacak sitenin aynı motoru, seçili cihazın gerçek genişliğinde çizilip çerçeveye sığdırılır. Site kendi
 * genişliğine baktığı için çerçeve gerçek ekran gibi davranır; içinde gezilir, sayfa değişir, kaydırılır. Dış bağlantı sihirbazı
 * terk ettirmez: yeni sekmede açılır.
 */
@Component({
    selector: 'app-site-preview',
    standalone: true,
    imports: [SiteRendererComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div #area class="area">
            <div class="frame" [class.is-phone]="device() === 'mobil'" [style.width.px]="logicalWidth() * scale()" [style.height.px]="logicalHeight() * scale()">
                <div #scroller class="scroller" data-site-scroller tabindex="0" aria-label="Sitenin önizlemesi" [style.width.px]="logicalWidth()" [style.height.px]="logicalHeight()" [style.transform]="'scale(' + scale() + ')'" (click)="keepInBuilder($event)">
                    <site-renderer [config]="config()" [path]="path()" (pathChange)="pathChange.emit($event)" [viewportHeight]="logicalHeight() + 'px'" />
                </div>
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }

        .area {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            height: 100%;
            overflow: hidden;
        }

        .frame {
            position: relative;
            overflow: hidden;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 1px 2px rgb(0 0 0 / 10%), 0 16px 40px rgb(0 0 0 / 14%);
        }

        .frame.is-phone {
            border-radius: 24px;
        }

        .scroller {
            overflow: hidden auto;
            scrollbar-width: thin;
            transform-origin: top left;
        }

        .is-phone .scroller {
            scrollbar-width: none;
        }

        .scroller:focus-visible {
            outline: none;
        }
    `
})
export class SitePreviewComponent {
    readonly config = input.required<SiteConfig>();
    readonly device = input<DeviceKey>('masaustu');
    readonly path = input('/');
    readonly focus = input<{ readonly type: SectionType; readonly tick: number } | null>(null);
    readonly pathChange = output<string>();
    /** Sitenin çizildiği öğe; denetim adımı bunun üzerinde ölçer. */
    readonly rootReady = output<HTMLElement>();

    private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');
    private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
    private readonly available = signal({ width: 0, height: 0 });

    protected readonly logicalWidth = computed(() => WIDTHS[this.device()]);
    protected readonly scale = computed(() => {
        const { width } = this.available();

        return width > 0 ? Math.min(1, width / this.logicalWidth()) : 0.5;
    });
    protected readonly logicalHeight = computed(() => Math.max(480, Math.round(this.available().height / this.scale())));

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const element = this.area().nativeElement;
            const measure = (): void => this.available.set({ width: element.clientWidth, height: element.clientHeight });
            const observer = new ResizeObserver(measure);

            measure();
            observer.observe(element);
            destroyRef.onDestroy(() => observer.disconnect());
            this.rootReady.emit(this.scroller().nativeElement);
        });

        effect(() => {
            const focus = this.focus();

            if (focus) setTimeout(() => this.scrollToSection(focus.type), 60);
        });
    }

    /** Motorun iç bağlantıları tıklamayı kendisi işler; kalan bağlantı dış adrestir (randevu, harita, sosyal medya). */
    protected keepInBuilder(event: MouseEvent): void {
        const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');

        if (!anchor || event.defaultPrevented) return;

        event.preventDefault();

        if (/^https?:/i.test(anchor.href)) window.open(anchor.href, '_blank', 'noopener');
    }

    private scrollToSection(type: SectionType): void {
        const scroller = this.scroller().nativeElement;

        if (type === 'nav' || type === 'hero') {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (type === 'footer') {
            scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        } else {
            scroller.querySelector(`[data-anchor="${type}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }
}

/** Küçük canlı render: sihirbazın kartlarındaki konsept ve bölüm önizlemeleri. Etkileşime kapalıdır, gerçek bileşenleri çizer. */
@Component({
    selector: 'app-site-thumb',
    standalone: true,
    imports: [SiteRendererComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="clip" [style.aspect-ratio]="logicalWidth() + ' / ' + logicalHeight()">
            <div class="stage" inert aria-hidden="true" [style.width.px]="logicalWidth()" [style.height.px]="logicalHeight()" [style.transform]="'scale(' + scale() + ')'">
                <site-renderer [config]="config()" [only]="only()" [maxSections]="maxSections()" [viewportHeight]="logicalHeight() + 'px'" />
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
            min-width: 0;
        }

        .clip {
            position: relative;
            overflow: hidden;
            background: #f4f3ef;
        }

        .stage {
            position: absolute;
            top: 0;
            left: 0;
            overflow: hidden;
            transform-origin: top left;
            pointer-events: none;
        }
    `
})
export class SiteThumbComponent {
    readonly config = input.required<SiteConfig>();
    readonly only = input<SectionType | null>(null);
    readonly maxSections = input<number | null>(1);
    readonly logicalWidth = input(1280);
    readonly logicalHeight = input(800);

    private readonly width = signal(0);

    protected readonly scale = computed(() => (this.width() > 0 ? this.width() / this.logicalWidth() : 0.2));

    constructor() {
        const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const observer = new ResizeObserver(() => this.width.set(host.clientWidth));

            this.width.set(host.clientWidth);
            observer.observe(host);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
