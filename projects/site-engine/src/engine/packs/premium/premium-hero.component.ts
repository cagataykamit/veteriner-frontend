import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { stockPhoto } from '../../stock-photos';
import { SECTION_BASE } from '../../section-base';
import { SiteStatusComponent } from '../../site-parts.component';

/**
 * Premium: ekranı dolduran koyu fotoğraf, altta uzun satırlı zarif başlık; bir galeri afişi gibi. Metin fotoğraf üstünde olduğu
 * için beyazdır, alt taraf karartılır (token sözleşmesindeki tek istisna).
 */
@Component({
    selector: 'site-premium-hero',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="hero" [class.no-photo]="!photo()">
            @if (photo(); as image) {
                <img class="bg" [siteImg]="image" eager />
            }
            <div class="inner over">
                <div class="text">
                    <p class="eyebrow">{{ v.copy.heroEyebrow }}</p>
                    <h1 class="h title">{{ v.copy.heroTitle }}</h1>
                </div>
                <div class="foot">
                    <p class="lead">{{ v.copy.heroText }}</p>
                    <div class="acts">
                        @if (v.cta; as cta) {
                            <a siteCta class="btn acc">{{ cta.label }}</a>
                        }
                        <a class="more" siteLink="/#services">{{ v.copy.ctaSecondary }}</a>
                    </div>
                    <site-status class="status" />
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            /* Telefonda yazı fotoğrafın altındadır: dar ekranda üstüne binince yüzü örter. */
            .hero {
                position: relative;
                overflow: hidden;
                background: #0c0b0a;
                color: #ffffff;
            }

            .bg {
                aspect-ratio: 1;
                height: auto;
                object-position: 56% 22%;
                filter: saturate(0.88);
            }

            .hero::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                left: 0;
                aspect-ratio: 1;
                background: linear-gradient(to top, #0c0b0a 0%, rgb(12 11 10 / 0%) 34%);
                pointer-events: none;
            }

            .over {
                position: relative;
                z-index: 1;
                display: grid;
                gap: 28px;
                padding-block: 12px clamp(28px, 4cqi, 56px);
            }

            .hero.no-photo::after {
                display: none;
            }

            .no-photo .over {
                padding-top: clamp(56px, 8cqi, 96px);
            }

            .eyebrow {
                margin-bottom: 16px;
                font-size: 12px;
                letter-spacing: 0.2em;
                text-transform: uppercase;
            }

            .title {
                max-width: 15ch;
                font-size: calc(var(--s-head-scale) * clamp(44px, 7.2cqi, 112px));
                line-height: 0.98;
            }

            .foot {
                display: grid;
                gap: 20px;
                padding-top: 20px;
                border-top: 1px solid rgb(255 255 255 / 38%);
            }

            .lead {
                max-width: 40ch;
                font-size: 17px;
                line-height: 1.55;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px 24px;
            }

            .more {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                text-underline-offset: 6px;
            }

            a:focus-visible {
                outline-color: #ffffff;
            }

            @media (prefers-reduced-motion: no-preference) {
                .bg {
                    animation: premium-settle 1.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
                }
            }

            @keyframes premium-settle {
                from {
                    opacity: 0.4;
                    transform: scale(1.05);
                }
            }

            @container site (min-width: 860px) {
                .hero {
                    display: flex;
                    align-items: flex-end;
                    min-height: min(calc(var(--s-vh) - 69px), 960px);
                }

                .bg {
                    position: absolute;
                    inset: 0;
                    height: 100%;
                    aspect-ratio: auto;
                }

                .hero::after {
                    inset: 0;
                    aspect-ratio: auto;
                    background: linear-gradient(to top, rgb(8 7 6 / 92%) 0%, rgb(8 7 6 / 72%) 42%, rgb(8 7 6 / 8%) 78%);
                }

                .over {
                    padding-block: 120px clamp(28px, 4cqi, 56px);
                }

                .foot {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) auto;
                    align-items: center;
                    gap: 32px;
                }

                .bg {
                    object-position: 50% 32%;
                }
            }
        `
    ]
})
export class PremiumHeroComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().heroImage ?? stockPhoto('premium-hero'));
}
