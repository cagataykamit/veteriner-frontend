import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Premium: sayfa boyu büyük tırnaklı satırlar; açıklama sağda küçük durur. Kart ya da ikon yok. */
@Component({
    selector: 'site-premium-features',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <h2 class="kick s-head">{{ v.copy.featuresTitle }}</h2>
                <ul>
                    @for (feature of v.features; track $index) {
                        <li>
                            <h3 class="h t">{{ feature.title }}</h3>
                            <p class="muted">{{ feature.text }}</p>
                        </li>
                    }
                </ul>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .kick {
                margin-bottom: 24px;
                color: var(--s-accent-text);
                font-size: 12px;
                font-weight: 400;
                letter-spacing: 0.2em;
                text-transform: uppercase;
            }

            li {
                display: grid;
                gap: 8px;
                padding-block: clamp(18px, 2.6cqi, 36px);
                border-top: 1px solid var(--s-line);
            }

            li:last-child {
                border-bottom: 1px solid var(--s-line);
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(32px, 5.2cqi, 80px));
                line-height: 1;
            }

            p {
                max-width: 42ch;
                font-size: 16px;
                line-height: 1.55;
            }

            @container site (min-width: 860px) {
                li {
                    grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
                    align-items: center;
                    gap: 40px;
                }
            }
        `
    ]
})
export class PremiumFeaturesComponent extends SiteSection {}
