import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent, SiteStatusComponent } from '../site-parts.component';

/** Üst çubuğun boyu: eylem düğmeleri bunun altına kaçınca "ekrandan çıktı" sayılır. */
const BAR_HEIGHT = 64;

/**
 * Giriş bölümü (K-01, B'nin üst kısmı): renkli zemin, "Açık · Kapanış" çipi, büyük başlık, hap biçimli "Randevu al" ve "Ara · numara",
 * konum ve yol tarifi, kemerli büyük fotoğraf. Durum, telefon ve konum burada olduğu için ayrı bilgi kartı yoktur. Eylem düğmeleri
 * ekrandan çıkınca telefonda alt şerit görünür (`SiteContext.heroActionsVisible`).
 */
@Component({
    selector: 'site-hero',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="hero tinted">
            <div class="inner grid" [class.no-photo]="!v.photos.hero">
                <div class="text">
                    @if (v.hasHours) {
                        @if (v.contactPath; as path) {
                            <a class="chip" [siteLink]="path"><site-status [strong]="true" /></a>
                        } @else {
                            <p class="chip"><site-status [strong]="true" /></p>
                        }
                    }
                    <h1 class="h title">{{ v.copy.heroTitle }}</h1>
                    @if (v.copy.heroText) {
                        <p class="lead">{{ v.copy.heroText }}</p>
                    }
                    @if (v.bookingHref || v.telHref) {
                        <div #acts class="acts">
                            @if (v.bookingHref) {
                                <a class="btn main" [href]="v.bookingHref"><site-icon name="calendar" />{{ v.copy.ctaPrimary }}</a>
                            }
                            @if (v.telHref) {
                                <a class="btn" [class.main]="!v.bookingHref" [class.line]="!!v.bookingHref" [href]="v.telHref"><site-icon name="phone" />Ara · {{ v.phone }}</a>
                            }
                        </div>
                    }
                    @if (place(); as text) {
                        @if (v.mapHref; as href) {
                            <a class="loc" [href]="href" target="_blank" rel="noopener"><site-icon name="pin" /><span>{{ text }} · <u>Yol tarifi</u></span></a>
                        } @else {
                            <p class="loc"><site-icon name="pin" /><span>{{ text }}</span></p>
                        }
                    }
                </div>
                @if (v.photos.hero; as image) {
                    <figure class="photo"><img [siteImg]="image" eager /></figure>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .hero {
                padding-block: 20px 48px;
                text-align: center;
            }

            .grid {
                display: grid;
                gap: 32px;
            }

            .chip {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                padding: 0 16px;
                border-radius: 999px;
                background: var(--s-bg);
                color: var(--s-ink);
                text-decoration: none;
            }

            .title {
                margin: 16px 0 14px;
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.6cqi, 58px));
            }

            .lead {
                max-width: 40ch;
                margin-inline: auto;
                color: var(--s-muted);
                font-size: 17px;
                line-height: 1.55;
            }

            .acts {
                display: grid;
                gap: 10px;
                margin-top: 24px;
            }

            .acts .btn {
                min-height: 52px;
                white-space: normal;
            }

            .acts .btn.line {
                border-color: transparent;
                background: var(--s-bg);
                box-shadow: inset 0 0 0 1.5px var(--s-line);
            }

            .loc {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                margin-top: 10px;
                font-weight: 500;
                text-decoration: none;
            }

            .loc site-icon,
            .loc u {
                color: var(--s-primary-text);
            }

            .loc u {
                font-weight: 600;
                text-underline-offset: 3px;
            }

            .photo {
                width: 100%;
                max-width: 300px;
                margin-inline: auto;
            }

            .photo img {
                aspect-ratio: 4 / 5;
                border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
            }
        `,
        `
            @container site (min-width: 900px) {
                .hero {
                    padding-block: 40px 80px;
                    text-align: left;
                }

                .grid {
                    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
                    align-items: center;
                    gap: 56px;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 760px);
                }

                .title {
                    margin: 20px 0 18px;
                }

                .lead {
                    margin-inline: 0;
                    font-size: 19px;
                }

                .acts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 30px;
                }

                .acts .btn {
                    min-height: 56px;
                    padding: 0 26px;
                    white-space: nowrap;
                }

                .photo {
                    max-width: 440px;
                    margin-right: 0;
                }
            }
        `
    ]
})
export class SiteHeroComponent extends SiteSection {
    private readonly acts = viewChild<ElementRef<HTMLElement>>('acts');

    protected readonly place = computed(() => this.vm().location || this.vm().address);

    constructor() {
        super();

        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const element = this.acts()?.nativeElement;

            if (!element || typeof IntersectionObserver === 'undefined') return;

            const observer = new IntersectionObserver(([entry]) => this.site.heroActionsVisible.set(entry.isIntersecting || entry.boundingClientRect.top > 0), { rootMargin: `-${BAR_HEIGHT}px 0px 0px 0px` });

            observer.observe(element);
            destroyRef.onDestroy(() => observer.disconnect());
        });

        destroyRef.onDestroy(() => this.site.heroActionsVisible.set(true));
    }
}
