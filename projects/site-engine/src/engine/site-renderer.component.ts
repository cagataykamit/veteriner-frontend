import { NgComponentOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, input, model, untracked } from '@angular/core';
import type { HomeSectionType, SiteConfig } from '../model/site.model';
import { SECTION_COMPONENTS } from './section-registry';
import { SiteDockComponent } from './sections/site-dock.component';
import { SiteContext } from './site-context';
import { conceptByKey } from './site-concepts';
import { SitePageComponent } from './site-page.component';
import { resolveSitePage } from './site-page-route';
import { buildSiteTokens } from './site-tokens';
import { buildSiteVm } from './site-vm';

/**
 * Render motoru: yalnız site yapılandırmasını alıp çizer, sihirbazdan hiçbir şey bilmez. Önizleme, küçük resim ve tam sayfa aynı
 * bileşendir. Yerleşim ekran genişliğine değil kendi genişliğine bakar (`site` container'ı); bu yüzden önizleme çerçevesi gerçek
 * cihaz gibi davranır. `viewportHeight` çerçevenin yüksekliğidir; tam sayfada `100dvh`. Ana sayfa bölümleri sırayla yumuşak yüzey ve zemin
 * üstünde çizilir: klinik sırayı değiştirse de iki bölüm aynı zeminde yan yana gelmez. Telefonda alt eylem şeridi küçük resimde çizilmez.
 */
@Component({
    selector: 'site-renderer',
    standalone: true,
    imports: [NgComponentOutlet, SiteDockComponent, SitePageComponent],
    providers: [SiteContext],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="site" [style]="tokens()" [style.--s-vh]="viewportHeight()">
            <ng-container *ngComponentOutlet="sections.nav" />
            <main>
                @if (page().kind === 'home') {
                    <ng-container *ngComponentOutlet="sections.hero" />
                    @for (type of homeSections(); track type) {
                        <div class="slot" [attr.data-anchor]="type">
                            <ng-container *ngComponentOutlet="sections[type]" />
                        </div>
                    }
                } @else {
                    <site-page [page]="page()" />
                }
            </main>
            @if (vm().usesStock) {
                <p class="stock-note">Bu sitedeki bazı görseller temsilidir.</p>
            }
            <ng-container *ngComponentOutlet="sections.footer" />
            @if (maxSections() === null) {
                <site-dock />
            }
        </div>
    `,
    styles: `
        :host {
            display: block;
            container: site / inline-size;
        }

        .site {
            position: relative;
            min-height: var(--s-vh);
            overflow-x: clip;
            background: var(--s-bg);
            color: var(--s-ink);
            font-family: var(--s-body);
            font-size: 16px;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        .slot {
            scroll-margin-top: 76px;
        }

        .slot:nth-of-type(odd) {
            background: var(--s-surface);
        }

        .stock-note {
            margin: 0;
            padding: 12px 20px;
            color: var(--s-muted);
            font-size: 13px;
            text-align: center;
        }
    `
})
export class SiteRendererComponent {
    readonly config = input.required<SiteConfig>();
    /** Açık sayfa, site köküne göre ("/", "/hizmetler", "/#contact"). */
    readonly path = model('/');
    /** Sayfa bağlantılarının tam adresi için kök; yeni sekmede açmak bu sayede çalışır. */
    readonly baseHref = input('');
    readonly viewportHeight = input('100dvh');
    /** Ana sayfada en çok bu kadar bölüm (konsept küçük resmi). */
    readonly maxSections = input<number | null>(null);

    private readonly context = inject(SiteContext);
    private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    private readonly injector = inject(Injector);
    private readonly now = new Date();

    protected readonly tokens = computed(() => buildSiteTokens(this.config().design));
    protected readonly vm = computed(() => buildSiteVm(this.config(), conceptByKey(this.config().design.conceptKey).voice, this.now, this.context.failedImages()));

    protected readonly page = computed(() => resolveSitePage(this.path(), this.vm()));

    protected readonly sections = SECTION_COMPONENTS;

    protected readonly homeSections = computed((): readonly HomeSectionType[] => {
        const limit = this.maxSections();

        return limit === null ? this.vm().homeSections : this.vm().homeSections.slice(0, limit);
    });

    constructor() {
        this.context.connect({ vm: this.vm, path: this.path, base: this.baseHref, go: (path) => this.path.set(path) });

        effect(() => {
            const path = this.path();

            untracked(() => afterNextRender(() => this.scrollTo(path), { injector: this.injector }));
        });
    }

    /** Çapa varsa bölüme, yoksa sayfa başına; kaydıran öğe önizleme çerçevesi ya da pencere. */
    private scrollTo(path: string): void {
        const anchor = path.split('#')[1];
        const scroller = this.host.closest('[data-site-scroller]');

        if (anchor) {
            this.host.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: 'start' });
        } else if (scroller) {
            scroller.scrollTo({ top: 0 });
        } else if (this.maxSections() === null) {
            window.scrollTo({ top: 0 });
        }
    }
}
