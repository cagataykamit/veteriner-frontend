import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';

/** Klinik tanıtımı: solda büyük fotoğraf, sağda başlık ve paragraflar. Fotoğraf yoksa metin tek sütundur. */
@Component({
    selector: 'site-about',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-photo]="!v.photos.about">
                @if (v.photos.about; as image) {
                    <figure class="photo"><img [siteImg]="image" /></figure>
                }
                <div class="text">
                    <div class="s-head head">
                        <h2 class="h title">{{ v.copy.aboutTitle }}</h2>
                    </div>
                    @for (paragraph of v.aboutParagraphs; track $index) {
                        <p>{{ paragraph }}</p>
                    }
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .grid {
                display: grid;
                gap: 28px;
            }

            .photo img {
                aspect-ratio: 3 / 2;
                border-radius: var(--s-radius-img);
            }

            .text p {
                max-width: 64ch;
                color: var(--s-muted);
                font-size: 17px;
                line-height: 1.65;
            }

            .text p + p {
                margin-top: 12px;
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    align-items: center;
                    gap: 64px;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 760px);
                }

                .photo img {
                    aspect-ratio: 4 / 5;
                }
            }
        `
    ]
})
export class SiteAboutComponent extends SiteSection {}
