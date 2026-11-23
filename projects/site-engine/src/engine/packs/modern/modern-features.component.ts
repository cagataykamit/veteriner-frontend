import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: üst çizgiyle ayrılmış sütunlar, kart yok; başlık solda küçük kalır, cümleler öne çıkar. Altında geniş tek fotoğraf. */
@Component({
    selector: 'site-modern-features',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <h2 class="kick s-head">{{ v.copy.featuresTitle }}</h2>
                <ul class="cols">
                    @for (feature of v.features; track $index; let i = $index) {
                        <li>
                            <span class="n">{{ i + 1 }}</span>
                            <h3 class="h t">{{ feature.title }}</h3>
                            <p class="muted">{{ feature.text }}</p>
                        </li>
                    }
                </ul>
                @if (photo(); as image) {
                    <figure class="wide"><img [siteImg]="image" /></figure>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .kick {
                margin-bottom: 28px;
                color: var(--s-muted);
                font-size: 14px;
                font-weight: 500;
            }

            .wide {
                margin-top: 40px;
                aspect-ratio: 4 / 3;
                overflow: hidden;
                border-radius: var(--s-radius-img);
            }

            .cols {
                display: grid;
                gap: 28px;
            }

            li {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-top: 16px;
                border-top: 2px solid var(--s-ink);
            }

            .n {
                font-size: 13px;
                font-variant-numeric: tabular-nums;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(24px, 2.4cqi, 34px));
            }

            p {
                font-size: 16px;
                line-height: 1.5;
            }

            @container site (min-width: 620px) {
                .cols {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 40px 24px;
                }
            }

            @container site (min-width: 1040px) {
                .cols {
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                }

                .t {
                    min-height: 2.1em;
                }

                .wide {
                    aspect-ratio: 21 / 9;
                }
            }
        `
    ]
})
export class ModernFeaturesComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().featuresImage ?? this.vm().stock['modern-features']);
}
