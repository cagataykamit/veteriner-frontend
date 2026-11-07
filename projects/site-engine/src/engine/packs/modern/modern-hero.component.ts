import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteStatusComponent } from '../../site-parts.component';

/** Modern: dev tipografi üstte, altında sağ kenara taşan geniş fotoğraf; sol sütunda kısa künye. Kartsız, çizgiyle bölünür. */
@Component({
    selector: 'site-modern-hero',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="hero">
            <div class="inner head">
                <p class="eyebrow">{{ v.copy.heroEyebrow }}</p>
                <h1 class="h title">{{ v.copy.heroTitle }}</h1>
            </div>
            <div class="split" [class.no-photo]="!photo()">
                <div class="side">
                    <p class="lead">{{ v.copy.heroText }}</p>
                    <div class="acts">
                        @if (v.cta; as cta) {
                            <a siteCta class="btn main">{{ cta.label }}</a>
                        }
                        <a class="tlink" siteLink="/#services">{{ v.copy.ctaSecondary }}</a>
                    </div>
                    <dl class="sheet">
                        <div>
                            <dt>Durum</dt>
                            <dd><site-status /></dd>
                        </div>
                        @if (v.telHref) {
                            <div>
                                <dt>Telefon</dt>
                                <dd><a [href]="v.telHref">{{ v.phone }}</a></dd>
                            </div>
                        }
                        @if (v.location) {
                            <div>
                                <dt>Konum</dt>
                                <dd>{{ v.location }}</dd>
                            </div>
                        }
                    </dl>
                </div>
                @if (photo(); as image) {
                    <figure class="photo"><img [siteImg]="image" eager /></figure>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .hero {
                padding-top: clamp(32px, 5cqi, 80px);
                color: var(--s-ink);
            }

            .eyebrow {
                margin-bottom: 18px;
                color: var(--s-muted);
                font-size: 14px;
                font-weight: 500;
            }

            .title {
                max-width: 17ch;
                font-size: calc(var(--s-head-scale) * clamp(44px, 7.6cqi, 124px));
            }

            .split {
                display: flex;
                flex-direction: column;
                gap: 28px;
                margin-top: 28px;
            }

            .side {
                display: flex;
                flex-direction: column;
                gap: 24px;
                padding-inline: var(--s-gutter);
            }

            .lead {
                max-width: 36ch;
                font-size: 18px;
                line-height: 1.5;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px 20px;
            }

            .sheet {
                order: 3;
                border-top: 1px solid var(--s-line);
            }

            .sheet > div {
                display: grid;
                grid-template-columns: 76px minmax(0, 1fr);
                gap: 12px;
                align-items: center;
                min-height: 44px;
                padding-block: 8px;
                border-bottom: 1px solid var(--s-line);
                font-size: 14px;
            }

            .sheet dt {
                color: var(--s-muted);
            }

            .sheet dd a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                margin-block: -8px;
                font-weight: 500;
                font-variant-numeric: tabular-nums;
                text-underline-offset: 3px;
            }

            .photo {
                aspect-ratio: 4 / 3;
                overflow: hidden;
                background: var(--s-surface);
            }

            .no-photo {
                padding-bottom: var(--s-space);
            }

            @media (prefers-reduced-motion: no-preference) {
                .photo img {
                    animation: modern-reveal 1s cubic-bezier(0.2, 0.7, 0.2, 1) both;
                }
            }

            @keyframes modern-reveal {
                from {
                    transform: scale(1.04);
                }
            }

            @container site (min-width: 860px) {
                .split {
                    display: grid;
                    grid-template-columns: minmax(280px, 3fr) minmax(0, 9fr);
                    gap: clamp(28px, 4cqi, 64px);
                    margin-top: clamp(32px, 4cqi, 64px);
                }

                .side {
                    justify-content: space-between;
                    padding-right: 0;
                }

                .photo {
                    aspect-ratio: 16 / 9;
                    border-radius: var(--s-radius-img) 0 0 var(--s-radius-img);
                }

                .split.no-photo {
                    grid-template-columns: minmax(0, 1fr);
                }

                .no-photo .sheet {
                    max-width: 480px;
                }
            }
        `
    ]
})
export class ModernHeroComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().heroImage ?? this.vm().stock['modern-hero']);
}
