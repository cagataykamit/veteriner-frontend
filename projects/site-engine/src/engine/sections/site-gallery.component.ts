import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

const HOME_COUNT = 5;

/** Galeri: beş ve üstü fotoğrafta ilk kare büyük (mozaik), azında eşit kareler. Ana sayfada ilk beşi, galeri sayfasında hepsi. */
@Component({
    selector: 'site-gallery',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.galleryTitle }}</h2>
                </header>
                <ul class="grid" [class.is-mosaic]="photos().length >= count">
                    @for (photo of photos(); track $index) {
                        <li><img [siteImg]="photo" /></li>
                    }
                </ul>
                @if (v.pages.galeri && site.onHome() && v.gallery.length > count) {
                    <a class="btn line more" siteLink="/galeri">Bütün fotoğraflar<site-icon name="arrowRight" /></a>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 10px;
            }

            .grid.is-mosaic {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            li {
                overflow: hidden;
                border-radius: calc(var(--s-radius-img) * 0.75);
                background: var(--s-surface);
            }

            img {
                aspect-ratio: 1 / 1;
            }

            .is-mosaic li:first-child {
                grid-column: 1 / -1;
            }

            .is-mosaic li:first-child img {
                aspect-ratio: 16 / 9;
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 14px;
                }

                .grid.is-mosaic {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }

                .is-mosaic li:first-child {
                    position: relative;
                    grid-column: span 2;
                    grid-row: span 2;
                }

                /* Büyük kare satır yüksekliğini küçük karelerden alır; kendi fotoğrafının oranı ızgarayı uzatmaz. */
                .is-mosaic li:first-child img {
                    position: absolute;
                    inset: 0;
                    aspect-ratio: auto;
                }
            }
        `
    ]
})
export class SiteGalleryComponent extends SiteSection {
    protected readonly count = HOME_COUNT;
    protected readonly photos = computed(() => this.site.cap(this.vm().gallery, HOME_COUNT));
}
