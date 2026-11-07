import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: kemer ve daire ritmi, dalgalı bir hizada; mobilde yana kayan pencere dizisi. */
@Component({
    selector: 'site-nature-gallery',
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
                        <a class="tlink" siteLink="/galeri">Bütün fotoğraflar</a>
                    }
                </header>
            </div>
            <ul class="wave" tabindex="0" aria-label="Fotoğraflar, yatay kaydırılır">
                @for (photo of site.cap(v.gallery, 5); track $index) {
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
                margin-bottom: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            .wave {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 0 var(--s-gutter) 12px;
                overflow-x: auto;
                scroll-snap-type: x proximity;
                scroll-padding-inline: var(--s-gutter);
                scrollbar-width: thin;
            }

            li {
                flex: none;
                width: min(62cqi, 260px);
                aspect-ratio: 3 / 4;
                overflow: hidden;
                border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
                background: var(--s-surface);
                scroll-snap-align: start;
            }

            li:nth-child(even) {
                margin-top: 32px;
                aspect-ratio: 1;
                border-radius: 50%;
            }

            @container site (min-width: 860px) {
                .wave {
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 16px;
                    max-width: var(--s-max);
                    margin-inline: auto;
                    overflow: visible;
                }

                li {
                    width: calc((100% - 64px) / 5);
                }

                li:nth-child(even) {
                    margin-top: 72px;
                }
            }
        `
    ]
})
export class NatureGalleryComponent extends SiteSection {}
