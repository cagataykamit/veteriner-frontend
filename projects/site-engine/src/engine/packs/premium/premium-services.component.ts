import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];

/** Premium: koyu bantta menü kartı. Roma rakamı, tırnaklı başlık, altında italik olmayan kısa açıklama; iki sütun. */
@Component({
    selector: 'site-premium-services',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec band">
            <div class="inner">
                <header class="s-head head">
                    <span class="rule" aria-hidden="true"></span>
                    <h2 class="h title">{{ v.copy.servicesTitle }}</h2>
                    <p class="muted intro">{{ v.copy.servicesIntro }}</p>
                </header>
                <ol class="carte">
                    @for (service of site.cap(v.services, 8); track service.slug; let i = $index) {
                        <li>
                            <a [siteLink]="service.path">
                                <span class="n">{{ roman[i] ?? i + 1 }}</span>
                                <span class="txt">
                                    <span class="h t">{{ service.title }}</span>
                                    <span class="muted d">{{ service.summary }}</span>
                                </span>
                            </a>
                        </li>
                    }
                </ol>
                @if (v.pages.hizmetler && site.onHome()) {
                    <p class="all"><a siteLink="/hizmetler">Bütün hizmetler</a></p>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .head {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: clamp(32px, 5cqi, 72px);
                text-align: center;
            }

            .rule {
                width: 1px;
                height: 48px;
                margin-bottom: 24px;
                background: var(--s-primary-text);
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5.4cqi, 84px));
            }

            .intro {
                max-width: 44ch;
                margin-top: 14px;
                font-size: 16px;
                line-height: 1.55;
            }

            .carte {
                display: grid;
                column-gap: clamp(40px, 7cqi, 112px);
            }

            li {
                border-top: 1px solid var(--s-line);
            }

            a {
                text-decoration: none;
            }

            li a {
                display: grid;
                grid-template-columns: 44px minmax(0, 1fr);
                gap: 8px;
                align-items: baseline;
                padding: 20px 0;
                transition: padding 0.25s ease;
            }

            li a:hover {
                padding-left: 10px;
            }

            .n {
                color: var(--s-primary-text);
                font-family: var(--s-head);
                font-size: 16px;
            }

            .txt {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .t {
                font-size: calc(var(--s-head-scale) * clamp(24px, 2.4cqi, 34px));
                line-height: 1.1;
            }

            .d {
                font-size: 15px;
                line-height: 1.5;
            }

            .all {
                margin-top: 28px;
                text-align: center;
            }

            .all a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                font-size: 12px;
                letter-spacing: 0.14em;
                text-decoration: underline;
                text-transform: uppercase;
                text-underline-offset: 6px;
            }

            @container site (min-width: 860px) {
                .carte {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
        `
    ]
})
export class PremiumServicesComponent extends SiteSection {
    protected readonly roman = ROMAN;
}
