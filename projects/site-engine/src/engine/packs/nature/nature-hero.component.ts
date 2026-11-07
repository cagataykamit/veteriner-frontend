import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { stockPhoto } from '../../stock-photos';
import { SECTION_BASE } from '../../section-base';
import { SiteStatusComponent } from '../../site-parts.component';

/** Nature: serada bir pencere: kemerli uzun fotoğraf, yanında bol boşluk ve italik biten başlık. İnce bir yay ikisini bağlar. */
@Component({
    selector: 'site-nature-hero',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="hero">
            <div class="inner grid">
                <div class="text">
                    <p class="eyebrow">{{ v.copy.heroEyebrow }}</p>
                    <h1 class="h title">{{ title().lead }}<em>{{ title().last }}</em></h1>
                    <p class="lead">{{ v.copy.heroText }}</p>
                    <div class="acts">
                        @if (v.cta; as cta) {
                            <a siteCta class="btn main">{{ cta.label }}</a>
                        }
                        <a class="tlink" siteLink="/#services">{{ v.copy.ctaSecondary }}</a>
                    </div>
                    <site-status class="status" />
                </div>
                <div class="window">
                    <svg class="arc" viewBox="0 0 400 400" aria-hidden="true"><path d="M8 392 C8 180 180 8 392 8" /></svg>
                    <figure class="arch" [class.is-empty]="!one()">
                        @if (one(); as image) {
                            <img [siteImg]="image" eager />
                        } @else {
                            <span class="h mono" aria-hidden="true">{{ v.initial }}</span>
                        }
                    </figure>
                    @if (two(); as image) {
                        <figure class="pebble" aria-hidden="true"><img [siteImg]="image" [alt]="''" eager /></figure>
                    }
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .hero {
                padding-block: clamp(20px, 4cqi, 56px) clamp(56px, 8cqi, 112px);
                color: var(--s-ink);
            }

            .grid {
                display: grid;
                gap: 44px;
            }

            .eyebrow {
                margin-bottom: 20px;
                color: var(--s-primary-text);
                font-family: var(--s-head);
                font-size: 20px;
                font-style: italic;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(44px, 6.4cqi, 96px));
                line-height: 1.02;
            }

            em {
                color: var(--s-primary-text);
                font-style: italic;
            }

            .lead {
                max-width: 40ch;
                margin-top: 24px;
                font-size: 19px;
                line-height: 1.55;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px 22px;
                margin-top: 28px;
            }

            .status {
                margin-top: 24px;
            }

            .window {
                position: relative;
                margin-inline: 8% 0;
            }

            .arch {
                aspect-ratio: 4 / 5;
                overflow: hidden;
                border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
                background: var(--s-surface);
            }

            .arch.is-empty {
                display: grid;
                place-items: center;
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

            .mono {
                font-size: clamp(120px, 22cqi, 280px);
                font-style: italic;
                line-height: 1;
            }

            .pebble {
                position: absolute;
                bottom: 8%;
                left: -14%;
                width: 38%;
                aspect-ratio: 1;
                overflow: hidden;
                border: 6px solid var(--s-bg);
                border-radius: 50%;
                background: var(--s-surface);
            }

            .arc {
                position: absolute;
                top: -4%;
                left: -14%;
                width: 58%;
                fill: none;
                stroke: var(--s-accent-text);
                stroke-width: 1;
                vector-effect: non-scaling-stroke;
            }

            @media (prefers-reduced-motion: no-preference) {
                .arc path {
                    stroke-dasharray: 700;
                    animation: nature-draw 1.8s ease both;
                }
            }

            @keyframes nature-draw {
                from {
                    stroke-dashoffset: 700;
                }
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
                    align-items: end;
                    gap: clamp(40px, 7cqi, 120px);
                }

                .text {
                    padding-bottom: 32px;
                }
            }
        `
    ]
})
export class NatureHeroComponent extends SiteSection {
    protected readonly one = computed(() => this.vm().heroImage ?? stockPhoto('nature-hero'));
    protected readonly two = computed(() => stockPhoto('nature-hero-2'));
    protected readonly title = computed(() => this.lastWord(this.vm().copy.heroTitle));
}
