import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { stockPhoto } from '../../stock-photos';
import { SECTION_BASE } from '../../section-base';

/** Friendly: sohbet gibi: başlık soran balon, metin yanıtlayan balon; yanında eğik fotoğraf. */
@Component({
    selector: 'site-friendly-about',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-photo]="!photo()">
                <div class="talk">
                    <h2 class="h ask s-head">{{ v.copy.aboutTitle }}</h2>
                    @for (paragraph of v.aboutParagraphs; track $index) {
                        <p class="reply">{{ paragraph }}</p>
                    }
                </div>
                @if (photo(); as image) {
                    <figure class="photo"><img [siteImg]="image" /></figure>
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

            .talk {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .ask {
                position: relative;
                align-self: flex-start;
                max-width: 92%;
                padding: 16px 24px;
                border-radius: calc(var(--s-radius) + 12px);
                border-bottom-left-radius: 4px;
                background: var(--s-secondary);
                color: var(--s-on-secondary);
                font-size: calc(var(--s-head-scale) * clamp(28px, 3.8cqi, 52px));
            }

            .reply {
                align-self: flex-end;
                max-width: 92%;
                padding: 18px 22px;
                border-radius: calc(var(--s-radius) + 12px);
                border-bottom-right-radius: 4px;
                background: var(--s-surface);
                font-size: 18px;
                line-height: 1.5;
            }

            .photo {
                aspect-ratio: 4 / 3;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
                transform: rotate(1.5deg);
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
                    align-items: center;
                    gap: clamp(40px, 6cqi, 96px);
                }

                .photo {
                    aspect-ratio: 4 / 5;
                }

                .grid.no-photo {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
        `
    ]
})
export class FriendlyAboutComponent extends SiteSection {
    protected readonly photo = computed(() => this.vm().aboutImage ?? stockPhoto('friendly-about'));
}
