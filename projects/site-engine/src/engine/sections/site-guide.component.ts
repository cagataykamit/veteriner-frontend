import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

const HOME_COUNT = 3;

/** Sağlık rehberi: fotoğraflı yazı kartları. Ana sayfada ilk üçü, rehber sayfasında hepsi. */
@Component({
    selector: 'site-guide',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.guideTitle }}</h2>
                </header>
                <ul class="grid">
                    @for (article of site.cap(v.articles, count); track article.slug) {
                        <li>
                            <a class="card post" [siteLink]="article.path">
                                @if (article.image; as image) {
                                    <span class="pic"><img [siteImg]="image" [alt]="''" /></span>
                                }
                                <span class="body">
                                    <span class="meta">
                                        @if (article.category) {
                                            {{ article.category }} ·
                                        }
                                        {{ article.minutes }} dk okuma
                                    </span>
                                    <h3 class="h t">{{ article.title }}</h3>
                                    @if (article.summary) {
                                        <p class="d">{{ article.summary }}</p>
                                    }
                                </span>
                            </a>
                        </li>
                    }
                </ul>
                @if (v.pages.rehber && site.onHome() && v.articles.length > count) {
                    <a class="btn line more" siteLink="/saglik-rehberi">Bütün yazılar<site-icon name="arrowRight" /></a>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .grid {
                display: grid;
                gap: 16px;
            }

            .post {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
                text-decoration: none;
                transition: border-color 0.15s ease;
            }

            .post:hover {
                border-color: var(--s-line-strong);
            }

            .pic {
                display: block;
                overflow: hidden;
                aspect-ratio: 16 / 9;
                background: var(--s-surface);
            }

            .body {
                display: grid;
                gap: 6px;
                padding: 18px 18px 20px;
            }

            .meta {
                color: var(--s-accent-text);
                font-size: 14px;
                font-weight: 600;
            }

            .t {
                font-size: calc(var(--s-head-scale) * 21px);
            }

            .d {
                color: var(--s-muted);
                font-size: 15.5px;
                line-height: 1.5;
            }

            @container site (min-width: 640px) {
                .grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }
        `
    ]
})
export class SiteGuideComponent extends SiteSection {
    protected readonly count = HOME_COUNT;
}
