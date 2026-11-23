import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Premium: dergi yayılımı. Solda bir kapak yazısı, sağda yalnız başlıktan oluşan yazılar. */
@Component({
    selector: 'site-premium-guide',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <h2 class="h title s-head">{{ v.copy.guideTitle }}</h2>
                <div class="spread">
                    @if (cover(); as article) {
                        <a class="cover" [siteLink]="article.path">
                            @if (article.image; as image) {
                                <span class="photo"><img [siteImg]="image" [alt]="''" /></span>
                            }
                            <span class="meta">{{ article.category }}</span>
                            <span class="h ct">{{ article.title }}</span>
                            <span class="muted d">{{ article.summary }}</span>
                        </a>
                    }
                    <ul class="list">
                        @for (article of rest(); track article.slug) {
                            <li>
                                <a [siteLink]="article.path">
                                    <span class="meta">{{ article.category }} · {{ article.minutes }} dk</span>
                                    <span class="h lt">{{ article.title }}</span>
                                </a>
                            </li>
                        }
                    </ul>
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .title {
                margin-bottom: 32px;
                font-size: calc(var(--s-head-scale) * clamp(38px, 5.4cqi, 84px));
            }

            a {
                text-decoration: none;
            }

            .spread {
                display: grid;
                gap: 32px;
            }

            .cover {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .photo {
                display: block;
                aspect-ratio: 3 / 2;
                margin-bottom: 8px;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
            }

            .photo img {
                filter: saturate(0.9);
            }

            .meta {
                color: var(--s-accent-text);
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            .ct {
                font-size: calc(var(--s-head-scale) * clamp(28px, 3.2cqi, 48px));
            }

            .d {
                max-width: 48ch;
                font-size: 16px;
                line-height: 1.55;
            }

            li {
                border-top: 1px solid var(--s-line);
            }

            li a {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 20px 0;
            }

            .lt {
                font-size: calc(var(--s-head-scale) * clamp(23px, 2.2cqi, 30px));
                line-height: 1.12;
            }

            .cover:hover .ct,
            li a:hover .lt {
                color: var(--s-accent-text);
            }

            @container site (min-width: 860px) {
                .spread {
                    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
                    gap: clamp(40px, 7cqi, 112px);
                }
            }
        `
    ]
})
export class PremiumGuideComponent extends SiteSection {
    protected readonly cover = computed(() => this.vm().articles[0] ?? null);
    protected readonly rest = computed(() => this.site.cap(this.vm().articles, 4).slice(1));
}
