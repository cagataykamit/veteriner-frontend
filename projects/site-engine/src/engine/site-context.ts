import { afterNextRender, afterRenderEffect, computed, DestroyRef, Directive, ElementRef, HostAttributeToken, Injectable, inject, input, type Signal, signal } from '@angular/core';
import { PAGE_DEFS, type SiteImage } from '../model/site.model';
import type { SiteVm } from './site-vm';

const CONTACT_PATH = PAGE_DEFS.find((page) => page.key === 'iletisim')!.path;

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
    /** İletişim sayfası telefon, adres ve saatleri zaten gösterir; alt bilgi bunları tekrar yazmaz (W-04). */
    readonly onContactPage = computed(() => this.page() === CONTACT_PATH);
    readonly navTick = signal(0);
    /** Giriş bölümündeki eylem düğmeleri ekranda mı. Değilse telefonda alt şerit çıkar (W-01 A); giriş bölümü olmayan alt sayfada şerit hep görünür. */
    readonly heroActionsVisible = signal(true);
    /** Yüklenemeyen görsel adresleri: VM bunları düşer, bölüm görselsiz düzenini çizer. */
    readonly failedImages = signal<ReadonlySet<string>>(new Set());

    imageFailed(src: string): void {
        this.failedImages.update((failed) => (failed.has(src) ? failed : new Set(failed).add(src)));
    }

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

/**
 * `<img [siteImg]="foto">`: adres, alt metin ve tembel yükleme tek yerde. Boş alt ile süs görseli de olur. Yüklenemezse bağlama bildirir;
 * sunucudan gelen sayfada hata JS'ten önce olmuş olabilir, ilk çizimde bakılır.
 */
@Directive({
    selector: 'img[siteImg]',
    standalone: true,
    host: { '[attr.src]': 'siteImg().src', '[attr.alt]': 'alt() ?? siteImg().alt', '[attr.loading]': 'eager ? "eager" : "lazy"', '[attr.decoding]': 'eager ? "sync" : "async"', '(error)': 'site.imageFailed(siteImg().src)' }
})
export class SiteImgDirective {
    readonly siteImg = input.required<SiteImage>();
    /** Fotoğraf yanındaki metnin tekrarıysa boş verilir. */
    readonly alt = input<string | null>(null);

    protected readonly site = inject(SiteContext);
    protected readonly eager = inject(new HostAttributeToken('eager'), { optional: true }) !== null;

    constructor() {
        const image = inject(ElementRef<HTMLImageElement>).nativeElement as HTMLImageElement;

        afterNextRender(() => {
            if (image.complete && image.naturalWidth === 0) this.site.imageFailed(this.siteImg().src);
        });
    }
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

/** Üst çubuğun boyu: eylem düğmeleri bunun altına kaçınca "ekrandan çıktı" sayılır. */
const BAR_HEIGHT = 64;
const BELOW = 100000;

/**
 * Giriş bölümünün eylem düğmeleri: `<div siteHeroActs>`. Üst çubuğun üstüne kayınca telefonda alt şerit görünür (W-01 A,
 * `SiteContext.heroActionsVisible`). Dört konseptin giriş bölümü aynı kuralı bu yönergeyle paylaşır. Gözlem alanı aşağı doğru
 * sınırsızdır: düğmeler ekranın altındayken de "görünür" sayılır; çapaya atlamak gibi tek karede aşağıdan yukarıya geçişte de
 * durum değişir ve bildirilir.
 */
@Directive({
    selector: '[siteHeroActs]',
    standalone: true
})
export class SiteHeroActsDirective {
    constructor() {
        const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
        const site = inject(SiteContext);
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            if (typeof IntersectionObserver === 'undefined') return;

            const observer = new IntersectionObserver(([entry]) => site.heroActionsVisible.set(entry.isIntersecting), { rootMargin: `-${BAR_HEIGHT}px 0px ${BELOW}px 0px` });

            observer.observe(host);
            destroyRef.onDestroy(() => observer.disconnect());
        });

        destroyRef.onDestroy(() => site.heroActionsVisible.set(true));
    }
}

export const SECTION_DIRECTIVES = [SiteLinkDirective, SiteImgDirective, SiteCtaDirective, SiteNavFitDirective, SiteHeroActsDirective] as const;

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
