import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PUBLIC_FEATURE_GROUPS, PUBLIC_FEATURE_SECTIONS, publicFeatureCardPlans, publicFeatureGroupShotCaption } from '@/app/features/public/utils/public-features-content.utils';
import { PUBLIC_HOME_DAY_FLOW } from '@/app/features/public/utils/public-home-content.utils';
import { PUBLIC_FEATURE_VISUALS } from '@/app/features/public/utils/public-screenshot-crops.utils';
import { PUBLIC_FEATURES_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
import { PUBLIC_SITE_SHOWCASE } from '@/app/features/public/utils/public-site-showcase-content.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicScreenshotComponent } from './components/public-screenshot.component';
import { PublicSiteShowcaseComponent } from './components/public-site-showcase.component';

/**
 * Özellikler (tasarım belgesi 5.2): 6 bölüm, her biri kendi tonunda panel; büyük ekran, köşesinde yapışkan not gibi yakın çekim,
 * altında maddeler. Ardından klinik web sitesi vitrini ve gün akışı dışındaki işler kart gruplarında (kartta paket etiketi; grubun
 * ekranı varsa kartların altında, altyazıda kartın adı ve paketi). Bölüm dizini geniş ekranda solda noktalı yol, dar ekranda üstte
 * yapışkan şerittir; kaydırdıkça ekranın ortasından geçen bölüm işaretlenir.
 */
@Component({
    selector: 'app-public-features-page',
    standalone: true,
    imports: [RouterLink, PublicPageHeaderComponent, PublicScreenshotComponent, PublicSiteShowcaseComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header
            eyebrow="Özellikler"
            title="Gelişten tahsilata bir günün akışı"
            lead="Modül listesi değil, bir ziyaretin yolculuğu: hasta kapıdan girer, muayene olur, ücreti alınır, gün kapanır. Ardından hasta sahibine ulaşan ve işletmeyi yöneten araçlar."
        >
            <ol class="ps-list ps-path" aria-label="Günün durakları">
                @for (step of dayFlow; track step.id; let i = $index) {
                    <li [class]="toneOf(i)">
                        <span class="ps-bubble" aria-hidden="true">{{ i + 1 }}</span>
                        <strong>{{ step.title }}</strong>
                    </li>
                }
            </ol>
        </app-public-page-header>

        <div class="ps-wrap ps-layout">
            <!-- Yol dizini: geniş ekranda solda noktalı yol, dar ekranda üstte kayan renkli haplar; kaydırdıkça etkin bölüm işaretlenir -->
            <nav class="ps-route" aria-label="Bölüm dizini">
                <ol class="ps-list">
                    @for (item of index; track item.id; let i = $index) {
                        <li [class]="item.tone">
                            <a
                                [routerLink]="[]"
                                [fragment]="item.id"
                                [class.ps-route--active]="activeSection() === item.id"
                                [class.ps-route--done]="i < activeSectionIndex()"
                                [attr.aria-current]="activeSection() === item.id ? 'location' : null"
                            >
                                <span class="ps-route-dot" aria-hidden="true"></span>{{ item.title }}
                            </a>
                        </li>
                    }
                </ol>
            </nav>

            <div class="ps-stack">
                @for (section of sections; track section.id; let i = $index) {
                    <section [id]="section.id" data-section-spy [class]="'ps-panel ps-feature ' + toneById[section.id]" [attr.aria-labelledby]="'feature-' + section.id">
                        <header class="ps-feature-head">
                            <span class="ps-bubble ps-bubble--big" aria-hidden="true">{{ i + 1 }}</span>
                            <div>
                                <h2 [id]="'feature-' + section.id" class="public-h2">{{ section.title }}</h2>
                                <p class="public-lead">{{ section.lead }}</p>
                            </div>
                        </header>
                        <div class="ps-feature-shot">
                            <app-public-screenshot [crop]="visuals[section.id].main" [phoneCrop]="visuals[section.id].phone" />
                            <div class="ps-feature-sticker ps-not-phone">
                                <app-public-screenshot [crop]="visuals[section.id].details[0].crop" [sticker]="true" [caption]="visuals[section.id].details[0].label" />
                            </div>
                        </div>
                        <ul class="ps-list ps-points">
                            @for (bullet of section.bullets; track bullet) {
                                <li><i class="pi pi-check" aria-hidden="true"></i><span>{{ bullet }}</span></li>
                            }
                        </ul>
                    </section>
                }

                <section [id]="showcase.id" data-section-spy [class]="'ps-panel ps-feature--plain ' + toneById[showcase.id]" [attr.aria-labelledby]="'feature-' + showcase.id">
                    <app-public-site-showcase [headingId]="'feature-' + showcase.id" />
                </section>

                @for (group of groups; track group.id; let g = $index) {
                    <section [id]="group.id" data-section-spy [class]="'ps-group ' + toneById[group.id]" [attr.aria-labelledby]="'feature-' + group.id">
                        <header class="ps-feature-head">
                            <span class="ps-bubble ps-bubble--big" aria-hidden="true">{{ noOf(group.id) }}</span>
                            <div>
                                <h2 [id]="'feature-' + group.id" class="public-h2">{{ group.title }}</h2>
                                <p class="public-lead">{{ group.lead }}</p>
                            </div>
                        </header>
                        <div class="ps-grid">
                            @for (card of group.cards; track card.title) {
                                <article class="ps-card ps-card--plain" data-feature-card>
                                    <span class="ps-round" aria-hidden="true"><i [class]="card.icon"></i></span>
                                    <h3 class="ps-h3">{{ card.title }}</h3>
                                    <p>{{ card.description }}</p>
                                    <p class="ps-plan" data-feature-plans>{{ plansOf(card) }}</p>
                                </article>
                            }
                        </div>
                        @if (group.shot; as shot) {
                            <app-public-screenshot [shot]="shot.screenshot" [caption]="shotCaptionOf(group)" />
                        }
                    </section>
                }
            </div>
        </div>

        <app-public-cta />
    `
})
export class PublicFeaturesPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly sections = PUBLIC_FEATURE_SECTIONS;
    readonly groups = PUBLIC_FEATURE_GROUPS;
    readonly showcase = PUBLIC_SITE_SHOWCASE;
    /** Dizin ve her bölümün tonu: altı adım sırayla dört tonu döner, vitrin nane, kart grupları gökten başlar. Panel ve dizin noktası aynı tonu buradan alır. */
    readonly index = [
        ...PUBLIC_FEATURE_SECTIONS.map(({ id, title }, i) => ({ id, title, tone: publicSiteToneClass(i) })),
        { id: PUBLIC_SITE_SHOWCASE.id, title: PUBLIC_SITE_SHOWCASE.indexTitle, tone: publicSiteToneClass(0) },
        ...PUBLIC_FEATURE_GROUPS.map(({ id, title }, g) => ({ id, title, tone: publicSiteToneClass(g + 1) }))
    ];
    readonly toneById: Readonly<Record<string, string>> = Object.fromEntries(this.index.map((item) => [item.id, item.tone]));
    readonly plansOf = publicFeatureCardPlans;
    readonly shotCaptionOf = publicFeatureGroupShotCaption;
    readonly visuals = PUBLIC_FEATURE_VISUALS;
    readonly dayFlow = PUBLIC_HOME_DAY_FLOW;
    readonly toneOf = publicSiteToneClass;

    readonly activeSection = signal<string>(this.index[0].id);
    readonly activeSectionIndex = computed(() => this.index.findIndex((item) => item.id === this.activeSection()));

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            // Test ortamında (jsdom) yok; dizin yine çalışır, yalnız etkin bölüm işaretlenmez.
            if (typeof IntersectionObserver === 'undefined') {
                return;
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    const hit = entries.find((entry) => entry.isIntersecting);

                    if (hit) {
                        this.activeSection.set(hit.target.id);
                        this.revealInStrip(hit.target.id);
                    }
                },
                { rootMargin: '-40% 0px -55% 0px' }
            );

            this.host.nativeElement.querySelectorAll('[data-section-spy]').forEach((section) => observer.observe(section));
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    /** Dar ekranda dizin yatay şerittir: etkin bölümün hapı görünür alana kayar (sayfa dikey kaymaz). */
    private revealInStrip(id: string): void {
        const strip = this.host.nativeElement.querySelector<HTMLElement>('.ps-route ol');
        const link = strip?.querySelector<HTMLElement>(`a[href$="#${id}"]`);

        if (!strip || !link || strip.scrollWidth <= strip.clientWidth) {
            return;
        }

        strip.scrollTo({ left: link.offsetLeft - strip.offsetLeft - 20, behavior: 'smooth' });
    }

    /** Dizindeki sıra numarası (kart gruplarının başlık rozeti). */
    noOf(id: string): string {
        return String(this.index.findIndex((item) => item.id === id) + 1).padStart(2, '0');
    }

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_FEATURES_PAGE_META, this.document);
    }
}
