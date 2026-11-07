import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: defter sayfası; yuvarlak küçük fotoğraf, italik kategori, tırnaklı başlık. İki sütun. */
@Component({
    selector: 'site-nature-guide',
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
                <ul class="notes">
                    @for (article of site.cap(v.articles, 4); track article.slug) {
                        <li>
                            <a [siteLink]="article.path" [class.no-pic]="!article.image">
                                @if (article.image; as image) {
                                    <span class="pic"><img [siteImg]="image" [alt]="''" /></span>
                                }
                                <span class="txt">
                                    <span class="cat">{{ article.category }} · {{ article.minutes }} dk</span>
                                    <span class="h t">{{ article.title }}</span>
                                    <span class="muted d">{{ article.summary }}</span>
                                </span>
                            </a>
                        </li>
                    }
                </ul>
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
                gap: 6px 24px;
                margin-bottom: 24px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            li {
                border-top: 1px solid var(--s-line);
            }

            li a {
                display: grid;
                grid-template-columns: 80px minmax(0, 1fr);
                gap: 16px;
                padding: 20px 0;
                text-decoration: none;
            }

            li a.no-pic {
                grid-template-columns: minmax(0, 1fr);
            }

            .pic {
                display: block;
                width: 80px;
                height: 80px;
                overflow: hidden;
                border-radius: 50%;
                background: var(--s-surface);
            }

            .txt {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .cat {
                color: var(--s-primary-text);
                font-family: var(--s-head);
                font-size: 16px;
                font-style: italic;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(22px, 2.2cqi, 30px));
                line-height: 1.14;
            }

            li a:hover .t {
                font-style: italic;
            }

            .d {
                font-size: 15px;
                line-height: 1.5;
            }

            @container site (min-width: 860px) {
                .notes {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    column-gap: clamp(32px, 6cqi, 96px);
                }

                li a {
                    grid-template-columns: 120px minmax(0, 1fr);
                    gap: 24px;
                }

                .pic {
                    width: 120px;
                    height: 120px;
                }
            }
        `
    ]
})
export class NatureGuideComponent extends SiteSection {}
