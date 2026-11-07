import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: basamak basamak içeri giren, açılır satırlar; açılınca yuvarlak fotoğraf ve kısa anlatım çıkar. */
@Component({
    selector: 'site-nature-services',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec tint">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.servicesTitle }}</h2>
                    <p class="intro">{{ v.copy.servicesIntro }}</p>
                </header>
                <div class="steps">
                    @for (service of site.cap(v.services, 6); track service.slug; let first = $first) {
                        <details [open]="first">
                            <summary>
                                <span class="h t">{{ service.title }}</span>
                                <i class="pi pi-plus" aria-hidden="true"></i>
                            </summary>
                            <div class="open">
                                @if (service.image) {
                                    <span class="pic"><img [siteImg]="service.image" [alt]="''" /></span>
                                }
                                <div>
                                    <p>{{ service.summary }}</p>
                                    <a class="tlink" [siteLink]="service.path">Ayrıntılar</a>
                                </div>
                            </div>
                        </details>
                    }
                </div>
                @if (v.pages.hizmetler && site.onHome()) {
                    <a class="tlink all" siteLink="/hizmetler">Bütün hizmetler</a>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .tint {
                background: var(--s-tint);
                color: var(--s-on-tint);
                border-radius: clamp(40px, 9cqi, 140px) clamp(40px, 9cqi, 140px) 0 0;
            }

            .head {
                margin-bottom: 28px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            .intro {
                max-width: 44ch;
                margin-top: 14px;
                font-size: 18px;
                line-height: 1.5;
            }

            details {
                border-top: 1px solid color-mix(in srgb, var(--s-on-tint) 24%, transparent);
            }

            summary {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                min-height: 64px;
                padding: 14px 0;
                list-style: none;
                cursor: pointer;
            }

            summary::-webkit-details-marker {
                display: none;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(26px, 3cqi, 42px));
                transition: transform 0.25s ease;
            }

            summary:hover .t {
                font-style: italic;
            }

            .pi {
                font-size: 14px;
                transition: transform 0.25s ease;
            }

            details[open] .pi {
                transform: rotate(45deg);
            }

            .open {
                display: flex;
                align-items: center;
                gap: 18px;
                padding-bottom: 22px;
                font-size: 17px;
                line-height: 1.5;
            }

            .pic {
                flex: none;
                width: 104px;
                height: 104px;
                overflow: hidden;
                border-radius: 50%;
            }

            .all {
                margin-top: 16px;
            }

            @container site (min-width: 860px) {
                details:nth-child(3n + 2) {
                    margin-left: 7%;
                }

                details:nth-child(3n) {
                    margin-left: 14%;
                }

                .pic {
                    width: 148px;
                    height: 148px;
                }
            }
        `
    ]
})
export class NatureServicesComponent extends SiteSection {}
