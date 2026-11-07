import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: masaya saçılmış baskılar; farklı açılar, biraz üst üste. Mobilde yana kayar. */
@Component({
    selector: 'site-friendly-gallery',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.galleryTitle }}</h2>
                    @if (v.pages.galeri) {
                        <a class="tlink" siteLink="/galeri">Hepsini gör</a>
                    }
                </header>
            </div>
            <ul class="table" tabindex="0" aria-label="Fotoğraflar, yatay kaydırılır">
                @for (photo of site.cap(v.gallery, 6); track $index) {
                    <li><img [siteImg]="photo" /></li>
                }
            </ul>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .head {
                display: flex;
                flex-wrap: wrap;
                align-items: baseline;
                justify-content: space-between;
                gap: 6px 24px;
                margin-bottom: 20px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .table {
                display: flex;
                gap: 14px;
                padding: 16px var(--s-gutter) 24px;
                overflow-x: auto;
                scroll-snap-type: x proximity;
                scrollbar-width: thin;
            }

            li {
                flex: none;
                width: min(70cqi, 280px);
                aspect-ratio: 1;
                padding: 8px;
                border-radius: var(--s-radius);
                background: var(--s-bg);
                box-shadow: 0 10px 24px color-mix(in srgb, var(--s-ink) 16%, transparent);
                scroll-snap-align: center;
                transition: transform 0.25s ease;
            }

            li img {
                border-radius: calc(var(--s-radius) - 4px);
            }

            li:nth-child(3n + 1) {
                transform: rotate(-2deg);
            }

            li:nth-child(3n + 2) {
                transform: rotate(1.6deg) translateY(6px);
            }

            li:nth-child(3n) {
                transform: rotate(-0.6deg);
            }

            li:hover {
                z-index: 1;
                transform: scale(1.03);
            }

            @container site (min-width: 860px) {
                .table {
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 0;
                    max-width: var(--s-max);
                    margin-inline: auto;
                    overflow: visible;
                }

                li {
                    position: relative;
                    width: 31%;
                    margin: -8px -0.6%;
                }

                li:nth-child(even) {
                    margin-top: 20px;
                }
            }
        `
    ]
})
export class FriendlyGalleryComponent extends SiteSection {}
