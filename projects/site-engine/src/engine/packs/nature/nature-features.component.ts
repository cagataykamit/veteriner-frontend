import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: farklı boyda kemerli sütunlar, serada sıra sıra pencere gibi; metin alta oturur, ilk kemer fotoğraftır. Mobilde sade liste. */
@Component({
    selector: 'site-nature-features',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <h2 class="h title s-head">{{ v.copy.featuresTitle }}</h2>
                <ul class="arches">
                    @if (photo(); as image) {
                        <li class="pic"><img [siteImg]="image" /></li>
                    }
                    @for (feature of v.features; track $index) {
                        <li>
                            <h3 class="h t">{{ feature.title }}</h3>
                            <p>{{ feature.text }}</p>
                        </li>
                    }
                </ul>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .title {
                margin-bottom: 28px;
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            .arches {
                display: grid;
                gap: 10px;
            }

            li {
                padding: 40px 24px 28px;
                border-radius: 96px 96px var(--s-radius-img) var(--s-radius-img);
                background: var(--s-surface);
                text-align: center;
            }

            li:nth-child(even) {
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

            li.pic {
                height: 260px;
                padding: 0;
                overflow: hidden;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(25px, 2.4cqi, 34px));
                font-style: italic;
            }

            p {
                margin-top: 10px;
                font-size: 16px;
                line-height: 1.5;
            }

            @container site (min-width: 860px) {
                .arches {
                    display: flex;
                    align-items: flex-end;
                    gap: 14px;
                }

                li {
                    display: flex;
                    flex: 1 1 0;
                    flex-direction: column;
                    justify-content: flex-end;
                    min-width: 0;
                    border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
                }

                li.pic {
                    height: auto;
                    align-self: stretch;
                }

                li:nth-child(4n + 1) {
                    min-height: 360px;
                }

                li:nth-child(4n + 2) {
                    min-height: 440px;
                }

                li:nth-child(4n + 3) {
                    min-height: 390px;
                }

                li:nth-child(4n) {
                    min-height: 470px;
                }
            }
        `
    ]
})
export class NatureFeaturesComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().featuresImage ?? this.vm().stock['nature-features']);
}
