import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: ortada dar ve iri bir metin, iki yanda farklı yükseklikte yuvarlak hatlı fotoğraflar; aralarda boşluk bol. */
@Component({
    selector: 'site-nature-about',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-photo]="!one() && !two()">
                @if (one(); as image) {
                    <figure class="left"><img [siteImg]="image" /></figure>
                }
                <div class="body">
                    <h2 class="kick s-head">{{ v.copy.aboutTitle }}</h2>
                    <p class="h big">{{ v.aboutParagraphs[0] }}</p>
                    @for (paragraph of v.aboutParagraphs.slice(1); track $index) {
                        <p class="muted rest">{{ paragraph }}</p>
                    }
                </div>
                @if (two(); as image) {
                    <figure class="right"><img [siteImg]="image" /></figure>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .grid {
                display: grid;
                gap: 32px;
            }

            .kick {
                margin-bottom: 18px;
                color: var(--s-primary-text);
                font-family: var(--s-head);
                font-size: 20px;
                font-style: italic;
                font-weight: 400;
            }

            .big {
                font-size: calc(var(--s-head-scale) * clamp(27px, 3.2cqi, 46px));
                line-height: 1.2;
                text-wrap: pretty;
            }

            .rest {
                margin-top: 18px;
                font-size: 17px;
                line-height: 1.6;
            }

            figure {
                overflow: hidden;
                background: var(--s-surface);
            }

            .left {
                aspect-ratio: 4 / 3;
                border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
            }

            .right {
                justify-self: end;
                width: 62%;
                aspect-ratio: 1;
                border-radius: 50%;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 3fr) minmax(0, 6fr) minmax(0, 3fr);
                    align-items: start;
                    gap: clamp(32px, 5cqi, 88px);
                }

                .left {
                    aspect-ratio: 3 / 4;
                }

                .body {
                    padding-top: clamp(32px, 6cqi, 96px);
                }

                .right {
                    align-self: end;
                    width: 100%;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 1fr);
                }

                .no-photo .body {
                    max-width: 760px;
                    margin-inline: auto;
                    padding-top: 0;
                }
            }
        `
    ]
})
export class NatureAboutComponent extends SiteSection {
    protected readonly one = computed(() => this.vm().aboutImage ?? this.vm().stock['nature-about']);
    protected readonly two = computed(() => this.vm().stock['nature-about-2']);
}
