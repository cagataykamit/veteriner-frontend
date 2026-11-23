import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

/** Öne çıkan özellikler: işaretli kartlar ve yanında bölüm fotoğrafı. Fotoğraf yoksa kartlar geniş ekranda iki sütun olur. */
@Component({
    selector: 'site-features',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-photo]="!v.photos.features">
                <div class="text">
                    <header class="head">
                        <h2 class="h title">{{ v.copy.featuresTitle }}</h2>
                    </header>
                    <ul class="list">
                        @for (feature of v.features; track $index) {
                            <li class="card item">
                                <span class="bub"><site-icon name="check" /></span>
                                <span class="txt">
                                    <h3 class="t">{{ feature.title }}</h3>
                                    @if (feature.text) {
                                        <p class="d">{{ feature.text }}</p>
                                    }
                                </span>
                            </li>
                        }
                    </ul>
                </div>
                @if (v.photos.features; as image) {
                    <figure class="photo"><img [siteImg]="image" /></figure>
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
                gap: 28px;
            }

            .list {
                display: grid;
                gap: 12px;
            }

            .item {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 18px;
            }

            .bub {
                color: var(--s-accent-text);
            }

            .txt {
                min-width: 0;
            }

            .t {
                font: 600 17px/1.3 var(--s-body);
                overflow-wrap: break-word;
            }

            .d {
                margin-top: 4px;
                color: var(--s-muted);
                font-size: 15.5px;
                line-height: 1.5;
            }

            .photo img {
                aspect-ratio: 3 / 2;
                border-radius: var(--s-radius-img);
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
                    align-items: center;
                    gap: 64px;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 1fr);
                }

                .no-photo .list {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .photo img {
                    aspect-ratio: 4 / 5;
                }
            }
        `
    ]
})
export class SiteFeaturesComponent extends SiteSection {}
