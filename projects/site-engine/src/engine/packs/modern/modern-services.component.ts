import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: numaralı dizin. Satırın üstüne gelince renk dolar, küçük fotoğraf görünür; kart yok. */
@Component({
    selector: 'site-modern-services',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid">
                <header class="s-head side">
                    <h2 class="h title">{{ v.copy.servicesTitle }}</h2>
                    <p class="muted intro">{{ v.copy.servicesIntro }}</p>
                    @if (v.pages.hizmetler) {
                        <a class="tlink" siteLink="/hizmetler">Bütün hizmetler</a>
                    }
                </header>
                <ol class="rows">
                    @for (service of site.cap(v.services, 8); track service.slug; let i = $index) {
                        <li>
                            <a class="row" [siteLink]="service.path">
                                <span class="n">{{ (i + 1).toString().padStart(2, '0') }}</span>
                                <span class="txt">
                                    <span class="h t">{{ service.title }}</span>
                                    <span class="d">{{ service.summary }}</span>
                                </span>
                                <span class="thumb" aria-hidden="true">
                                    @if (service.image) {
                                        <img [siteImg]="service.image" [alt]="''" />
                                    }
                                </span>
                                <i class="pi pi-arrow-up-right" aria-hidden="true"></i>
                            </a>
                        </li>
                    }
                </ol>
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

            .title {
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.6cqi, 68px));
            }

            .intro {
                max-width: 34ch;
                margin: 16px 0 8px;
                font-size: 17px;
                line-height: 1.5;
            }

            .rows {
                border-top: 1px solid var(--s-line);
            }

            .row {
                display: grid;
                grid-template-columns: 32px minmax(0, 1fr) 20px;
                align-items: baseline;
                gap: 12px;
                min-height: 64px;
                padding: 16px 0;
                border-bottom: 1px solid var(--s-line);
                text-decoration: none;
                transition: background-color 0.2s ease, color 0.2s ease, padding 0.2s ease;
            }

            .n {
                color: var(--s-muted);
                font-size: 13px;
                font-variant-numeric: tabular-nums;
            }

            .txt {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(22px, 2.2cqi, 32px));
                line-height: 1.12;
            }

            .d {
                color: var(--s-muted);
                font-size: 15px;
                line-height: 1.45;
            }

            .thumb {
                display: none;
            }

            .pi {
                font-size: 13px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
                    column-gap: clamp(28px, 4cqi, 64px);
                }

                .side {
                    position: sticky;
                    top: 96px;
                    align-self: start;
                }

                .row {
                    grid-template-columns: 40px minmax(0, 1fr) 112px 20px;
                    align-items: center;
                    padding: 18px 12px 18px 0;
                }

                .thumb {
                    display: block;
                    height: 72px;
                    overflow: hidden;
                    border-radius: var(--s-radius);
                    opacity: 0;
                    transform: translateX(8px);
                    transition: opacity 0.2s ease, transform 0.2s ease;
                }

                .row:hover,
                .row:focus-visible {
                    padding-left: 12px;
                    background: var(--s-primary);
                    color: var(--s-on-primary);
                }

                .row:hover .n,
                .row:hover .d,
                .row:focus-visible .n,
                .row:focus-visible .d {
                    color: inherit;
                }

                .row:hover .thumb,
                .row:focus-visible .thumb {
                    opacity: 1;
                    transform: none;
                }
            }
        `
    ]
})
export class ModernServicesComponent extends SiteSection {}
