import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: 12 sütunlu asimetrik ızgara; büyük ve küçük kareler dönüşümlü, araya boş sütun girer. */
@Component({
    selector: 'site-modern-gallery',
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
                        <a class="tlink" siteLink="/galeri">Tüm fotoğraflar</a>
                    }
                </header>
                <ul class="mosaic">
                    @for (photo of site.cap(v.gallery, 6); track $index) {
                        <li><img [siteImg]="photo" /></li>
                    }
                </ul>
            </div>
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
                gap: 8px 24px;
                margin-bottom: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.6cqi, 68px));
            }

            .mosaic {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }

            li {
                aspect-ratio: 1;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
            }

            li:nth-child(3n + 1) {
                grid-column: span 2;
                aspect-ratio: 16 / 10;
            }

            @container site (min-width: 860px) {
                .mosaic {
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                    gap: 16px;
                }

                li,
                li:nth-child(3n + 1) {
                    grid-column: span 4;
                    aspect-ratio: 4 / 3;
                }

                li:nth-child(6n + 1) {
                    grid-column: span 7;
                    aspect-ratio: 16 / 10;
                }

                li:nth-child(6n + 2) {
                    grid-column: 9 / span 4;
                    align-self: end;
                    aspect-ratio: 1;
                }

                li:nth-child(6n + 3) {
                    grid-column: span 3;
                    aspect-ratio: 1;
                }

                li:nth-child(6n + 4) {
                    grid-column: span 5;
                    aspect-ratio: 4 / 3;
                }

                li:nth-child(6n + 5) {
                    grid-column: span 4;
                    aspect-ratio: 4 / 3;
                }

                li:nth-child(6n) {
                    grid-column: 5 / span 8;
                    aspect-ratio: 21 / 9;
                }
            }
        `
    ]
})
export class ModernGalleryComponent extends SiteSection {}
