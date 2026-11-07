import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: zikzak yol: yuvarlak numara etiketleri sırayla sağa sola iner; okunuşu bir mahalle ilanı kadar kolay. */
@Component({
    selector: 'site-friendly-features',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner box">
                <h2 class="h title s-head">{{ v.copy.featuresTitle }}</h2>
                <ol class="path">
                    @for (feature of v.features; track $index; let i = $index) {
                        <li>
                            <span class="dot h" aria-hidden="true">{{ i + 1 }}</span>
                            <div>
                                <h3 class="h t">{{ feature.title }}</h3>
                                <p>{{ feature.text }}</p>
                            </div>
                        </li>
                    }
                </ol>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .box {
                display: grid;
                gap: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .path {
                display: grid;
                gap: 20px;
            }

            li {
                display: grid;
                grid-template-columns: 56px minmax(0, 1fr);
                gap: 14px;
                align-items: start;
            }

            .dot {
                display: grid;
                place-items: center;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: var(--s-accent);
                color: var(--s-on-accent);
                font-size: 26px;
            }

            li:nth-child(even) .dot {
                background: var(--s-secondary);
                color: var(--s-on-secondary);
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(23px, 2.4cqi, 32px));
            }

            p {
                max-width: 42ch;
                margin-top: 6px;
                font-size: 17px;
                line-height: 1.45;
            }

            @container site (min-width: 860px) {
                .box {
                    grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
                    gap: clamp(32px, 5cqi, 80px);
                }

                .path {
                    gap: 28px;
                }

                li:nth-child(even) {
                    margin-left: clamp(40px, 9cqi, 140px);
                }
            }
        `
    ]
})
export class FriendlyFeaturesComponent extends SiteSection {}
