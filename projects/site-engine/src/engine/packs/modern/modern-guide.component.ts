import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: bir öne çıkan yazı ve altında satır satır içindekiler listesi. */
@Component({
    selector: 'site-modern-guide',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.guideTitle }}</h2>
                    @if (v.pages.rehber) {
                        <a class="tlink" siteLink="/saglik-rehberi">Bütün yazılar</a>
                    }
                </header>
                @for (article of site.cap(v.articles, 4); track article.slug; let first = $first) {
                    @if (first) {
                        <a class="lead" [siteLink]="article.path">
                            @if (article.image; as image) {
                                <span class="photo"><img [siteImg]="image" [alt]="''" /></span>
                            }
                            <span class="body">
                                <span class="meta muted">{{ article.category }} · {{ article.minutes }} dk</span>
                                <span class="h t">{{ article.title }}</span>
                                <span class="muted d">{{ article.summary }}</span>
                            </span>
                        </a>
                    } @else {
                        <a class="row" [siteLink]="article.path">
                            <span class="meta muted">{{ article.category }}</span>
                            <span class="h rt">{{ article.title }}</span>
                            <span class="meta muted mins">{{ article.minutes }} dk</span>
                        </a>
                    }
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .head {
                display: flex;
                flex-wrap: wrap;
                align-items: baseline;
                justify-content: space-between;
                gap: 8px 24px;
                margin-bottom: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.6cqi, 68px));
            }

            a {
                text-decoration: none;
            }

            .lead {
                display: grid;
                gap: 16px;
                margin-bottom: 24px;
            }

            .photo {
                display: block;
                aspect-ratio: 16 / 10;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-surface);
            }

            .body {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .meta {
                font-size: 14px;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(26px, 3cqi, 44px));
            }

            .d {
                font-size: 16px;
                line-height: 1.5;
            }

            .row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 4px 16px;
                align-items: baseline;
                min-height: 64px;
                padding: 14px 0;
                border-top: 1px solid var(--s-line);
            }

            .row .meta:first-child {
                grid-column: 1 / -1;
            }

            .rt {
                font-size: calc(var(--s-head-scale) * clamp(20px, 2cqi, 28px));
                line-height: 1.16;
            }

            .row:hover .rt,
            .lead:hover .t {
                text-decoration: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: 5px;
            }

            @container site (min-width: 860px) {
                .lead {
                    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
                    align-items: end;
                    gap: clamp(24px, 4cqi, 64px);
                    margin-bottom: 40px;
                }

                .row {
                    grid-template-columns: minmax(0, 3fr) minmax(0, 8fr) minmax(0, 1fr);
                    gap: 24px;
                }

                .row .meta:first-child {
                    grid-column: auto;
                }

                .mins {
                    text-align: right;
                }
            }
        `
    ]
})
export class ModernGuideComponent extends SiteSection {}
