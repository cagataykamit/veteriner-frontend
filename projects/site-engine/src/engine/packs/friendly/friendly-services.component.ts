import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: renkli blok kolajı; her karo farklı boyda ve renkte, bazıları fotoğraflı. Kaç hizmet olursa olsun dolu görünür. */
@Component({
    selector: 'site-friendly-services',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.servicesTitle }}</h2>
                    <p class="intro">{{ v.copy.servicesIntro }}</p>
                </header>
                <ul class="board">
                    @for (service of site.cap(v.services, 7); track service.slug; let i = $index) {
                        <li>
                            <a class="tile" [class]="'tile tone-' + (i % 5)" [siteLink]="service.path">
                                @if (i % 5 === 0 && service.image) {
                                    <span class="pic"><img [siteImg]="service.image" [alt]="''" /></span>
                                }
                                <span class="h t">{{ service.title }}</span>
                                <span class="d">{{ service.summary }}</span>
                            </a>
                        </li>
                    }
                    @if (site.onHome() && v.pages.hizmetler) {
                        <li class="all">
                            <a class="tile" siteLink="/hizmetler"><span class="h t">Bütün hizmetler</span><i class="pi pi-arrow-right" aria-hidden="true"></i></a>
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
                margin-bottom: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .intro {
                max-width: 44ch;
                margin-top: 12px;
                font-size: 18px;
                line-height: 1.45;
            }

            .board {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            li:nth-child(5n + 1),
            .all {
                grid-column: span 2;
            }

            .tile {
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 100%;
                min-height: 148px;
                padding: 18px;
                border-radius: var(--s-radius-img);
                text-decoration: none;
                transition: transform 0.2s ease;
            }

            .tile:hover {
                transform: translateY(-3px) rotate(-0.5deg);
            }

            .tone-0 {
                background: var(--s-primary);
                color: var(--s-on-primary);
            }

            .tone-1 {
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

            .tone-2 {
                background: var(--s-secondary);
                color: var(--s-on-secondary);
            }

            .tone-3 {
                background: var(--s-surface);
                color: var(--s-ink);
            }

            .tone-4 {
                background: var(--s-accent);
                color: var(--s-on-accent);
            }

            .pic {
                display: block;
                aspect-ratio: 16 / 9;
                margin-bottom: 4px;
                overflow: hidden;
                border-radius: var(--s-radius);
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(21px, 2.4cqi, 34px));
                line-height: 1.04;
                overflow-wrap: anywhere;
            }

            .d {
                font-size: 15px;
                line-height: 1.4;
            }

            .all .tile {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                min-height: 72px;
                border: 2px solid currentColor;
            }

            @container site (min-width: 860px) {
                .board {
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                    gap: 14px;
                }

                li {
                    grid-column: span 3;
                }

                li:nth-child(1) {
                    grid-column: span 6;
                    grid-row: span 2;
                }

                li:nth-child(4) {
                    grid-column: span 6;
                }

                li:nth-child(5) {
                    grid-column: span 4;
                }

                li:nth-child(6) {
                    grid-column: span 5;
                }

                .all {
                    grid-column: 1 / -1;
                }

                .tile {
                    min-height: 188px;
                    padding: 24px;
                    justify-content: flex-end;
                }

                .pic {
                    position: relative;
                    flex: 1;
                    aspect-ratio: auto;
                    min-height: 180px;
                }

                .pic img {
                    position: absolute;
                    inset: 0;
                }
            }
        `
    ]
})
export class FriendlyServicesComponent extends SiteSection {}
