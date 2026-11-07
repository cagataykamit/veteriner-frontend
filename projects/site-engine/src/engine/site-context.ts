import { afterNextRender, afterRenderEffect, computed, DestroyRef, Directive, ElementRef, HostAttributeToken, Injectable, inject, input, type Signal, signal } from '@angular/core';
import type { SiteImage } from '../model/site.model';
import type { SiteVm } from './site-vm';

/**
 * Bir site çiziminin bağlamı: VM, açık sayfa, iç bağlantılar. `SiteRendererComponent` sağlar; önizleme ve tam sayfa aynı yoldan
 * geçer. Bağlantı yalnız yolu değiştirir: tam sayfada kök bileşen yolu adres çubuğuna yazar, önizlemede çerçeve içinde kalır.
 */
@Injectable()
export class SiteContext {
    private source: { vm: Signal<SiteVm>; path: Signal<string>; base: Signal<string>; go: (path: string) => void } | null = null;

    readonly vm = computed(() => this.source!.vm());
    readonly path = computed(() => this.source?.path() ?? '/');
    /** Yol ile çapa ayrı: "/#iletisim" → "/" + "iletisim". */
    readonly page = computed(() => this.path().split('#')[0] || '/');
    readonly onHome = computed(() => this.page() === '/');
    readonly navTick = signal(0);

    connect(source: { vm: Signal<SiteVm>; path: Signal<string>; base: Signal<string>; go: (path: string) => void }): void {
        this.source = source;
    }

    href(path: string): string {
        const base = this.source?.base() ?? '';

        return path.startsWith('/#') ? `${base}${path.slice(1)}` : path === '/' ? base || '/' : `${base}${path}`;
    }

    go(event: Event, path: string): void {
        const mouse = event as MouseEvent;

        if (mouse.ctrlKey || mouse.metaKey || mouse.shiftKey) return;

        event.preventDefault();
        this.source?.go(path);
        this.navTick.update((tick) => tick + 1);
    }

    /** Ana sayfada kısa liste, kendi sayfasında tamamı. */
    cap<T>(list: readonly T[], count: number): readonly T[] {
        return this.onHome() ? list.slice(0, count) : list;
    }
}

/** Sitenin iç bağlantısı: `<a siteLink="/hizmetler">`. Çapa için "/#iletisim". */
@Directive({
    selector: 'a[siteLink]',
    standalone: true,
    host: { '[attr.href]': 'href()', '(click)': 'site.go($event, siteLink())' }
})
export class SiteLinkDirective {
    readonly siteLink = input.required<string>();

    protected readonly site = inject(SiteContext);
    protected readonly href = computed(() => this.site.href(this.siteLink()));
}

/** `<img [siteImg]="foto">`: adres, alt metin ve tembel yükleme tek yerde. Boş alt ile süs görseli de olur. */
@Directive({
    selector: 'img[siteImg]',
    standalone: true,
    host: { '[attr.src]': 'siteImg().src', '[attr.alt]': 'alt() ?? siteImg().alt', '[attr.loading]': 'eager ? "eager" : "lazy"', '[attr.decoding]': 'eager ? "sync" : "async"' }
})
export class SiteImgDirective {
    readonly siteImg = input.required<SiteImage>();
    /** Fotoğraf yanındaki metnin tekrarıysa boş verilir. */
    readonly alt = input<string | null>(null);

    protected readonly eager = inject(new HostAttributeToken('eager'), { optional: true }) !== null;
}

/** Ana eylem düğmesi: `vm.cta` randevu sayfasına ya da telefona gider. Metni çağıran yazar. */
@Directive({
    selector: 'a[siteCta]',
    standalone: true,
    host: { '[attr.href]': 'href()', '(click)': 'open($event)' }
})
export class SiteCtaDirective {
    private readonly site = inject(SiteContext);

    protected readonly href = computed(() => {
        const cta = this.site.vm().cta;

        return cta?.path ? this.site.href(cta.path) : (cta?.href ?? null);
    });

    protected open(event: Event): void {
        const path = this.site.vm().cta?.path;

        if (path) this.site.go(event, path);
    }
}

const GROUP_GAP = 20;
const SIDE_GAP = 28;

/**
 * Üst menünün bağlantıları sığıyor mu, ölçer. Klinik adının uzunluğu ve açık sayfa sayısı klinikten gelir; sabit kırılma noktası
 * bunu bilemez. Sığmazsa host `is-tight` alır: navigasyon bağlantıları gizleyip "Menü"ye geçer. Çubuk `[data-fit-bar]`; ölçülecekler
 * `data-fit="home"`, iki yan `data-fit="a"` ve `"b"`. Logo ortadaysa en geniş yan iki kez sayılır, çünkü logo tam ortada durur.
 */
@Directive({
    selector: '[siteNavFit]',
    standalone: true,
    host: { '[class.is-tight]': 'tight()' }
})
export class SiteNavFitDirective {
    private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    private readonly site = inject(SiteContext);

    protected readonly tight = signal(false);

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterRenderEffect(() => {
            this.site.vm();
            this.measure();
        });

        afterNextRender(() => {
            const bar = this.host.querySelector('[data-fit-bar]') ?? this.host;
            const observer = new ResizeObserver(() => this.measure());

            observer.observe(bar);
            destroyRef.onDestroy(() => observer.disconnect());
            void document.fonts.ready.then(() => this.measure());
        });
    }

    /** Bağlantı listesinin gerçek ihtiyacı: sıkışmış ya da sağa yaslanmış olsa da çocukların toplamı. */
    private naturalWidth(element: HTMLElement): number {
        if (element.tagName !== 'NAV') return element.scrollWidth;

        const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
        const items = [...element.children] as HTMLElement[];

        return items.reduce((total, item) => total + item.offsetWidth, 0) + Math.max(0, items.length - 1) * gap;
    }

    private measure(): void {
        const bar = this.host.querySelector<HTMLElement>('[data-fit-bar]');
        const home = this.host.querySelector<HTMLElement>('[data-fit="home"]');

        if (!bar || !home) return;

        const style = getComputedStyle(bar);
        const available = bar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const name = home.querySelector<HTMLElement>('.name');
        const homeWidth = home.offsetWidth + (name ? name.scrollWidth - name.clientWidth : 0);

        const side = (key: string): number => {
            const widths = [...this.host.querySelectorAll<HTMLElement>(`[data-fit="${key}"]`)].map((element) => this.naturalWidth(element)).filter((width) => width > 0);

            return widths.reduce((total, width) => total + width, 0) + Math.max(0, widths.length - 1) * GROUP_GAP;
        };

        const a = side('a');
        const b = side('b');
        const sides = this.site.vm().logoCenter ? 2 * Math.max(a, b) : a + b;

        this.tight.set(homeWidth + sides + 2 * SIDE_GAP > available);
    }
}

export const SECTION_DIRECTIVES = [SiteLinkDirective, SiteImgDirective, SiteCtaDirective, SiteNavFitDirective] as const;

/** Bölüm alternatiflerinin ortak tabanı. */
export abstract class SiteSection {
    protected readonly site = inject(SiteContext);
    protected readonly vm = this.site.vm;

    /** Başlığın son sözcüğünü vurgulamak için böler. */
    protected lastWord(text: string): { readonly lead: string; readonly last: string } {
        const at = text.trimEnd().lastIndexOf(' ');

        return at < 0 ? { lead: '', last: text } : { lead: text.slice(0, at + 1), last: text.slice(at + 1) };
    }
}
