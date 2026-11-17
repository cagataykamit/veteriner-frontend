import { ChangeDetectionStrategy, Component, computed, Directive, ElementRef, inject, Injectable, input, OnDestroy, signal } from '@angular/core';

/** Takvim kartının ayrıntı balonu (E-vet'teki gibi): saat, tür/neden, müşteri – hasta, klinik – hekim, not ve durum. */
export interface CalendarBubbleData {
    time: string;
    title: string;
    subject: string;
    place: string;
    notes: string | null;
    status: string;
    /** Durum noktasının rengi (Tailwind sınıfı). */
    tone: string;
}

interface BubbleState {
    data: CalendarBubbleData;
    anchor: HTMLElement;
}

const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 80;

/**
 * Sayfada tek balon: fare üzerine gelince kısa gecikmeyle, klavye odağında hemen açılır. Dokunmatikte ilk dokunuş balonu açar,
 * aynı karta ikinci dokunuş kartın kendi eylemini yapar. Sayfa bileşeni sağlar (`providers`).
 */
@Injectable()
export class CalendarBubbleService {
    readonly state = signal<BubbleState | null>(null);
    private timer: ReturnType<typeof setTimeout> | null = null;

    show(data: CalendarBubbleData, anchor: HTMLElement, immediate = false): void {
        this.clear();

        if (immediate) {
            this.state.set({ data, anchor });

            return;
        }

        this.timer = setTimeout(() => this.state.set({ data, anchor }), SHOW_DELAY_MS);
    }

    hide(): void {
        this.clear();
        this.timer = setTimeout(() => this.state.set(null), HIDE_DELAY_MS);
    }

    isShownFor(anchor: HTMLElement): boolean {
        return this.state()?.anchor === anchor;
    }

    close(): void {
        this.clear();
        this.state.set(null);
    }

    private clear(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

/** Kartı balona bağlar. Balon servisi yoksa (sayfa dışı kullanım) hiçbir şey yapmaz. */
@Directive({
    selector: '[appCalendarBubble]',
    standalone: true,
    host: {
        '(mouseenter)': 'onEnter()',
        '(mouseleave)': 'onLeave()',
        '(focus)': 'onFocus()',
        '(blur)': 'onLeave()',
        '(pointerdown)': 'onPointerDown($event)'
    }
})
export class CalendarBubbleDirective implements OnDestroy {
    readonly appCalendarBubble = input.required<CalendarBubbleData>();

    private readonly bubble = inject(CalendarBubbleService, { optional: true });
    private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private lastPointer: string | null = null;

    /** Yakalama aşamasında: dokunmatikte balon kapalıyken ilk dokunuş yalnız balonu açar, kartın tıklaması çalışmaz. */
    private readonly onClickCapture = (e: Event): void => {
        if (!this.bubble || this.lastPointer !== 'touch') {
            this.bubble?.close();

            return;
        }

        if (!this.bubble.isShownFor(this.el)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.bubble.show(this.appCalendarBubble(), this.el, true);

            return;
        }

        this.bubble.close();
    };

    constructor() {
        this.el.addEventListener('click', this.onClickCapture, { capture: true });
    }

    ngOnDestroy(): void {
        this.el.removeEventListener('click', this.onClickCapture, { capture: true });

        if (this.bubble?.isShownFor(this.el)) {
            this.bubble.close();
        }
    }

    protected onPointerDown(e: PointerEvent): void {
        this.lastPointer = e.pointerType;
    }

    protected onEnter(): void {
        if (this.lastPointer !== 'touch') {
            this.bubble?.show(this.appCalendarBubble(), this.el);
        }
    }

    protected onFocus(): void {
        if (this.lastPointer === null) {
            this.bubble?.show(this.appCalendarBubble(), this.el, true);
        }
    }

    protected onLeave(): void {
        if (this.lastPointer !== 'touch') {
            this.bubble?.hide();
        }

        this.lastPointer = null;
    }
}

const WIDTH = 288;
const GAP = 6;

/** Balonun kendisi: sabit konumda, kartın altında (yer yoksa üstünde); fareyi engellemez. */
@Component({
    selector: 'app-calendar-bubble',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:pointerdown)': 'onDocumentPointerDown($event)',
        '(window:scroll)': 'bubble.close()',
        '(window:resize)': 'bubble.close()',
        '(document:keydown.escape)': 'bubble.close()'
    },
    template: `
        @if (view(); as v) {
            <div
                class="fixed z-[1200] pointer-events-none rounded-border border border-surface bg-surface-0 dark:bg-surface-900 shadow-lg p-3 text-sm"
                [style.width.px]="width"
                [style.left.px]="v.left"
                [style.top.px]="v.top"
                [style.transform]="v.above ? 'translateY(-100%)' : null"
                role="tooltip"
                data-testid="calendar-bubble"
            >
                <p class="m-0 text-xs font-semibold tabular-nums text-muted-color">{{ v.data.time }}</p>
                <p class="m-0 mt-0.5 font-semibold text-surface-900 dark:text-surface-0">{{ v.data.title }}</p>
                <p class="m-0 mt-1">{{ v.data.subject }}</p>
                <p class="m-0 text-muted-color">{{ v.data.place }}</p>
                @if (v.data.notes) {
                    <p class="m-0 mt-2 whitespace-pre-wrap line-clamp-4 border-t border-surface pt-2">{{ v.data.notes }}</p>
                }
                <p class="m-0 mt-2 inline-flex items-center gap-1.5 text-xs font-medium"><span class="w-2 h-2 rounded-full" [class]="v.data.tone" aria-hidden="true"></span>{{ v.data.status }}</p>
            </div>
        }
    `
})
export class CalendarBubbleComponent {
    protected readonly bubble = inject(CalendarBubbleService);
    protected readonly width = WIDTH;

    protected readonly view = computed(() => {
        const s = this.bubble.state();

        if (!s || !s.anchor.isConnected) {
            return null;
        }

        const r = s.anchor.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const above = vh - r.bottom < 200 && r.top > vh - r.bottom;
        const left = Math.max(8, Math.min(r.left, vw - WIDTH - 8));

        return { data: s.data, left, top: above ? r.top - GAP : r.bottom + GAP, above };
    });

    protected onDocumentPointerDown(e: PointerEvent): void {
        const s = this.bubble.state();

        if (s && !s.anchor.contains(e.target as Node)) {
            this.bubble.close();
        }
    }
}
