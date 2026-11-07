import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Premium: dikey, çerçeveli tek fotoğraf ve yanında büyük harfle başlayan metin; basılı dergi sayfası gibi. */
@Component({
    selector: 'site-premium-about',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-photo]="!photo()">
                @if (photo(); as image) {
                    <figure class="frame"><img [siteImg]="image" /></figure>
                }
                <div class="body">
                    <h2 class="h title s-head">{{ v.copy.aboutTitle }}</h2>
                    @for (paragraph of v.aboutParagraphs; track $index; let first = $first) {
                        <p [class.lede]="first" [class.rest]="!first">{{ paragraph }}</p>
                    }
                    @if (v.pages.hakkimizda && site.onHome()) {
                        <a class="more" siteLink="/hakkimizda">Kliniği tanıyın</a>
                    }
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .grid {
                display: grid;
                gap: 40px;
            }

            .frame {
                position: relative;
                aspect-ratio: 4 / 5;
                margin: 12px;
            }

            .frame::before {
                content: '';
                position: absolute;
                inset: -12px;
                border: 1px solid var(--s-accent-text);
            }

            .frame img {
                position: relative;
                filter: saturate(0.9);
            }

            .title {
                margin-bottom: 24px;
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.2cqi, 64px));
            }

            .lede {
                font-size: 19px;
                line-height: 1.6;
            }

            .lede::first-letter {
                float: left;
                margin: 6px 10px 0 0;
                color: var(--s-accent-text);
                font-family: var(--s-head);
                font-size: 72px;
                line-height: 0.82;
            }

            .rest {
                margin-top: 18px;
                color: var(--s-muted);
                font-size: 16px;
                line-height: 1.65;
            }

            .more {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                margin-top: 20px;
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                text-underline-offset: 6px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    align-items: center;
                    gap: clamp(48px, 9cqi, 140px);
                }

                .body {
                    max-width: 560px;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 1fr);
                }

                .no-photo .body {
                    max-width: 720px;
                }
            }
        `
    ]
})
export class PremiumAboutComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().aboutImage ?? this.vm().stock['premium-about']);
}
