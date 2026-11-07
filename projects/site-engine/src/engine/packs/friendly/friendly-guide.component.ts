import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: yana kayan küçük notlar; biri fotoğraflı geniş, biri renkli yalnız metin, dönüşümlü. */
@Component({
    selector: 'site-friendly-guide',
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
                <ul class="rail" tabindex="0" aria-label="Yazılar, yatay kaydırılır">
                    @for (article of site.cap(v.articles, 4); track article.slug; let i = $index) {
                        <li [class.wide]="i % 2 === 0">
                            <a class="note" [siteLink]="article.path">
                                @if (i % 2 === 0 && article.image; as image) {
                                    <span class="pic"><img [siteImg]="image" [alt]="''" /></span>
                                }
                                <span class="cat">{{ article.category }}</span>
                                <span class="h t">{{ article.title }}</span>
                                <span class="d">{{ article.summary }}</span>
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
                margin-bottom: 20px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .rail {
                display: flex;
                gap: 14px;
                margin-inline: calc(-1 * var(--s-gutter));
                padding: 4px var(--s-gutter) 12px;
                overflow-x: auto;
                scroll-snap-type: x proximity;
                scroll-padding-inline: var(--s-gutter);
                scrollbar-width: thin;
            }

            li {
                flex: none;
                width: min(72cqi, 280px);
                scroll-snap-align: start;
            }

            li.wide {
                width: min(82cqi, 420px);
            }

            .note {
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 100%;
                padding: 16px;
                border-radius: var(--s-radius-img);
                background: var(--s-tint);
                color: var(--s-on-tint);
                text-decoration: none;
                transition: transform 0.2s ease;
            }

            .note:hover {
                transform: translateY(-3px);
            }

            .wide .note {
                background: var(--s-surface);
                color: var(--s-ink);
            }

            .pic {
                display: block;
                aspect-ratio: 16 / 10;
                margin-bottom: 4px;
                overflow: hidden;
                border-radius: var(--s-radius);
            }

            .cat {
                align-self: flex-start;
                padding: 3px 10px;
                border-radius: 999px;
                background: var(--s-secondary);
                color: var(--s-on-secondary);
                font-size: 13px;
                font-weight: 600;
            }

            .t {
                font-size: calc(var(--s-head-scale) * 24px);
                line-height: 1.08;
            }

            .d {
                font-size: 15px;
                line-height: 1.45;
            }
        `
    ]
})
export class FriendlyGuideComponent extends SiteSection {}
