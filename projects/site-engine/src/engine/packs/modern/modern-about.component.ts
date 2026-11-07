import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { stockPhoto } from '../../stock-photos';
import { SECTION_BASE } from '../../section-base';

/** Modern: solda küçük etiket, sağda büyük puntoyla düz yazı gibi açıklama; altında farklı boyda iki fotoğraf. */
@Component({
    selector: 'site-modern-about',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid">
                <p class="kick s-head">{{ v.copy.aboutTitle }}</p>
                <div class="body">
                    <p class="h big">{{ v.aboutParagraphs[0] }}</p>
                    @for (paragraph of v.aboutParagraphs.slice(1); track $index) {
                        <p class="rest muted">{{ paragraph }}</p>
                    }
                </div>
                @if (one() || two()) {
                    <div class="pair" [class.is-single]="!one() || !two()">
                        @if (one(); as image) {
                            <figure class="a"><img [siteImg]="image" /></figure>
                        }
                        @if (two(); as image) {
                            <figure class="b"><img [siteImg]="image" /></figure>
                        }
                    </div>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .grid {
                display: grid;
                gap: 20px;
            }

            .kick {
                color: var(--s-muted);
                font-size: 14px;
                font-weight: 500;
            }

            .big {
                font-size: calc(var(--s-head-scale) * clamp(26px, 3.6cqi, 52px));
                line-height: 1.16;
                text-wrap: pretty;
            }

            .rest {
                max-width: 58ch;
                margin-top: 20px;
                font-size: 17px;
                line-height: 1.6;
            }

            .pair {
                display: grid;
                grid-template-columns: 2fr 1fr;
                align-items: end;
                gap: 8px;
                margin-top: 24px;
            }

            .pair.is-single {
                grid-template-columns: minmax(0, 1fr);
            }

            .pair figure {
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
            }

            .a {
                aspect-ratio: 4 / 3;
            }

            .b {
                aspect-ratio: 3 / 4;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 3fr) minmax(0, 9fr);
                    column-gap: clamp(28px, 4cqi, 64px);
                }

                .pair {
                    grid-column: 2;
                    gap: 16px;
                    margin-top: 48px;
                }
            }
        `
    ]
})
export class ModernAboutComponent extends SiteSection {
    protected readonly one = computed(() => this.vm().aboutImage ?? stockPhoto('modern-about'));
    protected readonly two = computed(() => stockPhoto('modern-about-2'));
}
