import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Premium: sergi düzeni. Tek fotoğraf sayfa genişliğinde; altındaki küçük şeritten seçilir, alt metni yazı olarak görünür. */
@Component({
    selector: 'site-premium-gallery',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="gal">
            <h2 class="sr s-head">{{ v.copy.galleryTitle }}</h2>
            <figure class="stage">
                @if (active(); as photo) {
                    <img [siteImg]="photo" />
                    <figcaption>
                        <span>{{ photo.alt }}</span>
                        <span>{{ index() + 1 }} / {{ v.gallery.length }}</span>
                    </figcaption>
                }
            </figure>
            @if (v.gallery.length > 1) {
                <ul class="strip">
                    @for (photo of v.gallery; track $index; let i = $index) {
                        <li>
                            <button type="button" [class.is-on]="i === index()" [attr.aria-current]="i === index() ? 'true' : null" [attr.aria-label]="'Fotoğraf ' + (i + 1) + ': ' + photo.alt" (click)="index.set(i)">
                                <img [siteImg]="photo" [alt]="''" />
                            </button>
                        </li>
                    }
                </ul>
            }
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .sr {
                position: absolute;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip-path: inset(50%);
            }

            .stage {
                position: relative;
                aspect-ratio: 4 / 3;
                overflow: hidden;
                background: var(--s-surface);
            }

            .stage img {
                filter: saturate(0.9);
            }

            @media (prefers-reduced-motion: no-preference) {
                .stage img {
                    animation: premium-fade 0.5s ease both;
                }
            }

            @keyframes premium-fade {
                from {
                    opacity: 0.5;
                }
            }

            figcaption {
                position: absolute;
                right: 0;
                bottom: 0;
                left: 0;
                display: flex;
                justify-content: space-between;
                gap: 16px;
                padding: 40px var(--s-gutter) 16px;
                background: linear-gradient(to top, rgb(8 7 6 / 78%), transparent);
                color: #ffffff;
                font-size: 13px;
            }

            figcaption span:last-child {
                flex: none;
                font-variant-numeric: tabular-nums;
            }

            .strip {
                display: flex;
                gap: 4px;
                padding: 4px var(--s-gutter);
                overflow-x: auto;
                scrollbar-width: thin;
            }

            li {
                flex: none;
            }

            button {
                display: block;
                width: 72px;
                height: 56px;
                padding: 0;
                border: 0;
                background: var(--s-surface);
                opacity: 0.6;
                cursor: pointer;
                transition: opacity 0.2s ease;
            }

            button:hover,
            button.is-on {
                opacity: 1;
            }

            button.is-on {
                outline: 1px solid var(--s-accent-text);
                outline-offset: 1px;
            }

            @container site (min-width: 860px) {
                .stage {
                    aspect-ratio: 21 / 9;
                }

                .strip {
                    justify-content: center;
                }

                button {
                    width: 104px;
                    height: 72px;
                }
            }
        `
    ]
})
export class PremiumGalleryComponent extends SiteSection {
    protected readonly index = signal(0);
    protected readonly active = computed(() => {
        const list = this.vm().gallery;

        return list[Math.min(this.index(), list.length - 1)] ?? null;
    });
}
