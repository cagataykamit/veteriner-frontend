import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { stockPhoto } from '../../stock-photos';
import { SECTION_BASE } from '../../section-base';
import { SiteStatusComponent } from '../../site-parts.component';

/** Friendly: buzdolabına iliştirilmiş fotoğraf gibi: hafif eğik büyük kare, üstünde küçük etiketler; başlığın son sözcüğü fosforlu. */
@Component({
    selector: 'site-friendly-hero',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="hero">
            <div class="inner grid">
                <div class="text">
                    <p class="eyebrow">{{ v.copy.heroEyebrow }}</p>
                    <h1 class="h title">{{ title().lead }}<mark>{{ title().last }}</mark></h1>
                    <p class="lead">{{ v.copy.heroText }}</p>
                    <div class="acts">
                        @if (v.cta; as cta) {
                            <a siteCta class="btn main">{{ cta.label }}</a>
                        }
                        @if (v.telHref) {
                            <a class="btn line" [href]="v.telHref"><i class="pi pi-phone" aria-hidden="true"></i>{{ v.phone }}</a>
                        }
                    </div>
                </div>
                <div class="stack">
                    <figure class="main-photo" [class.is-empty]="!one()">
                        @if (one(); as image) {
                            <img [siteImg]="image" eager />
                        } @else {
                            <span class="h mono" aria-hidden="true">{{ v.initial }}</span>
                        }
                    </figure>
                    @if (two(); as image) {
                        <figure class="mini" aria-hidden="true"><img [siteImg]="image" [alt]="''" eager /></figure>
                    }
                    <p class="tag status"><site-status /></p>
                    <a class="tag serv" siteLink="/#services">{{ v.copy.ctaSecondary }}<i class="pi pi-arrow-down" aria-hidden="true"></i></a>
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .hero {
                margin-top: -70px;
                padding-block: 96px clamp(40px, 6cqi, 88px);
                color: var(--s-ink);
            }

            .grid {
                display: grid;
                gap: 40px;
            }

            .eyebrow {
                display: inline-block;
                margin-bottom: 18px;
                padding: 6px 14px;
                border-radius: 999px;
                background: var(--s-tint);
                color: var(--s-on-tint);
                font-size: 14px;
                font-weight: 600;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(42px, 6.6cqi, 96px));
                line-height: 1;
            }

            /* Satır içi kutu değil: arka plan satırın içinde kalır, üst satırın kuyruklu harflerini (y, g, ş) örtmez. */
            mark {
                display: inline-block;
                max-width: 100%;
                margin-top: 0.06em;
                padding: 0.02em 0.14em 0.06em;
                border-radius: 0.2em;
                background: var(--s-secondary);
                color: var(--s-on-secondary);
                font: inherit;
                line-height: 1;
                overflow-wrap: anywhere;
            }

            .lead {
                max-width: 40ch;
                margin-top: 20px;
                font-size: 19px;
                line-height: 1.45;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 24px;
            }

            .stack {
                position: relative;
                margin-inline: 6px 10px;
            }

            .main-photo {
                aspect-ratio: 1;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
                transform: rotate(-2deg);
            }

            .main-photo.is-empty {
                display: grid;
                place-items: center;
                background: var(--s-secondary);
                color: var(--s-on-secondary);
            }

            .mono {
                font-size: clamp(120px, 26cqi, 320px);
                line-height: 1;
            }

            .mini {
                position: absolute;
                bottom: -18px;
                left: -6px;
                width: 34%;
                aspect-ratio: 1;
                overflow: hidden;
                border: 5px solid var(--s-bg);
                border-radius: 50%;
                transform: rotate(4deg);
            }

        `,
        `
            .tag {
                position: absolute;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                box-shadow: 0 8px 20px color-mix(in srgb, var(--s-ink) 16%, transparent);
            }

            .status {
                top: 12px;
                left: -4px;
                background: var(--s-bg);
                color: var(--s-ink);
                transform: rotate(-3deg);
            }

            .serv {
                right: -4px;
                bottom: 28px;
                background: var(--s-accent);
                color: var(--s-on-accent);
                transform: rotate(3deg);
                transition: transform 0.2s ease;
            }

            .serv:hover {
                transform: rotate(0deg);
            }

            .serv .pi {
                font-size: 12px;
            }

            @media (prefers-reduced-motion: no-preference) {
                .main-photo {
                    animation: friendly-drop 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
                }
            }

            @keyframes friendly-drop {
                from {
                    opacity: 0;
                    transform: rotate(3deg) translateY(16px);
                }
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
                    align-items: center;
                    gap: clamp(32px, 6cqi, 96px);
                }

                .hero {
                    padding-top: 124px;
                }
            }
        `
    ]
})
export class FriendlyHeroComponent extends SiteSection {
    protected readonly one = computed(() => this.vm().heroImage ?? stockPhoto('friendly-hero'));
    protected readonly two = computed(() => stockPhoto('friendly-hero-2'));
    protected readonly title = computed(() => this.lastWord(this.vm().copy.heroTitle));
}
