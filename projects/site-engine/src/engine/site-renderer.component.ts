import { NgComponentOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, input, model, untracked } from '@angular/core';
import type { HomeSectionType, SectionType, SiteConfig } from '../model/site.model';
import { findAlternative } from './section-registry';
import { SiteContext } from './site-context';
import { conceptByKey } from './site-concepts';
import { resolveSitePage, SitePageComponent } from './site-page.component';
import { buildSiteTokens } from './site-tokens';
import { buildSiteVm } from './site-vm';

/**
 * Render motoru: yalnız site yapılandırmasını alıp çizer, sihirbazdan hiçbir şey bilmez. Önizleme, küçük resim ve tam sayfa aynı
 * bileşendir. Yerleşim ekran genişliğine değil kendi genişliğine bakar (`site` container'ı); bu yüzden önizleme çerçevesi gerçek
 * cihaz gibi davranır. `viewportHeight` çerçevenin yüksekliğidir; tam sayfada `100dvh`.
 */
@Component({
    selector: 'site-renderer',
    standalone: true,
    imports: [NgComponentOutlet, SitePageComponent],
    providers: [SiteContext],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="site" [style]="tokens()" [style.--s-vh]="viewportHeight()">
            @if (only(); as type) {
                <ng-container *ngComponentOutlet="component(type)" />
            } @else {
                <ng-container *ngComponentOutlet="component('nav')" />
                <main>
                    @if (page().kind === 'home') {
                        <ng-container *ngComponentOutlet="component('hero')" />
                        @for (section of homeSections(); track section.key) {
                            <div class="slot" [attr.data-anchor]="section.type">
                                <ng-container *ngComponentOutlet="section.component" />
                            </div>
                        }
                    } @else {
                        <site-page [page]="page()" [sections]="config().design.sections" />
                    }
                </main>
                <ng-container *ngComponentOutlet="component('footer')" />
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
            scroll-margin-top: 72px;
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
    /** Yalnız bu bölümü çiz (sihirbazdaki alternatif küçük resmi). */
    readonly only = input<SectionType | null>(null);
    /** Ana sayfada en çok bu kadar bölüm (konsept küçük resmi). */
    readonly maxSections = input<number | null>(null);

    private readonly context = inject(SiteContext);
    private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    private readonly injector = inject(Injector);
    private readonly now = new Date();

    protected readonly tokens = computed(() => buildSiteTokens(this.config().design));
    protected readonly vm = computed(() => buildSiteVm(this.config(), conceptByKey(this.config().design.conceptKey).voice, this.now));

    protected readonly page = computed(() => resolveSitePage(this.path(), this.vm()));

    protected readonly homeSections = computed(() => {
        const limit = this.maxSections();
        const list = limit === null ? this.vm().homeSections : this.vm().homeSections.slice(0, limit);

        return list.map((type: HomeSectionType) => {
            const alternative = findAlternative(type, this.config().design.sections[type]);

            return { type, key: `${type}:${alternative.key}`, component: alternative.component };
        });
    });

    constructor() {
        this.context.connect({ vm: this.vm, path: this.path, base: this.baseHref, go: (path) => this.path.set(path) });

        effect(() => {
            const path = this.path();

            untracked(() => afterNextRender(() => this.scrollTo(path), { injector: this.injector }));
        });
    }

    protected component(type: SectionType) {
        return findAlternative(type, this.config().design.sections[type]).component;
    }

    /** Çapa varsa bölüme, yoksa sayfa başına; kaydıran öğe önizleme çerçevesi ya da pencere. */
    private scrollTo(path: string): void {
        const anchor = path.split('#')[1];
        const scroller = this.host.closest('[data-site-scroller]');

        if (anchor) {
            this.host.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: 'start' });
        } else if (scroller) {
            scroller.scrollTo({ top: 0 });
        } else if (!this.only() && this.maxSections() === null) {
            window.scrollTo({ top: 0 });
        }
    }
}
