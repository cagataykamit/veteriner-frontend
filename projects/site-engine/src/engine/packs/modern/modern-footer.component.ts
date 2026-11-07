import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: çizgili sütunlar ve en altta sayfa genişliğinde klinik adı. */
@Component({
    selector: 'site-modern-footer',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <footer class="foot">
            <div class="inner">
                <div class="cols">
                    <nav aria-label="Alt menü">
                        <ul>
                            @for (link of v.menu; track link.path) {
                                <li><a [siteLink]="link.path">{{ link.label }}</a></li>
                            }
                        </ul>
                    </nav>
                    <div>
                        @if (v.telHref) {
                            <a class="big" [href]="v.telHref">{{ v.phone }}</a>
                        }
                        @if (v.mailHref) {
                            <a [href]="v.mailHref">{{ v.email }}</a>
                        }
                        @if (v.address) {
                            <address class="muted">{{ v.address }}, {{ v.location }}</address>
                        }
                    </div>
                    <div>
                        @for (group of v.groups; track group.label) {
                            <p class="hour"><span>{{ group.label }}</span><span class="muted">{{ group.value }}</span></p>
                        }
                    </div>
                    @if (v.social.length) {
                        <ul class="social">
                            @for (link of v.social; track link.key) {
                                <li><a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a></li>
                            }
                        </ul>
                    }
                </div>
                <p class="h giant" aria-hidden="true">{{ v.name }}</p>
                <p class="made muted"><span>© {{ v.siteName }}</span><span>Vetinity ile hazırlandı</span></p>
            </div>
        </footer>
    `,
    styles: [
        SECTION_BASE,
        `
            .foot {
                padding-top: clamp(40px, 6cqi, 80px);
                padding-bottom: 20px;
                border-top: 1px solid var(--s-line);
                background: var(--s-bg);
                color: var(--s-ink);
            }

            .cols {
                display: grid;
                gap: 28px;
                font-size: 15px;
                line-height: 1.5;
            }

            .cols a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                text-decoration: none;
            }

            .cols a:hover {
                text-decoration: underline;
                text-underline-offset: 4px;
            }

            .cols > div {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            nav ul {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                column-gap: 16px;
            }

            .big {
                font-weight: 600;
            }

            .hour {
                display: flex;
                justify-content: space-between;
                gap: 16px;
                width: 100%;
                padding: 8px 0;
                border-bottom: 1px solid var(--s-line);
            }

            .social {
                display: flex;
                flex-wrap: wrap;
                gap: 0 18px;
            }

            .giant {
                margin-top: clamp(32px, 6cqi, 80px);
                font-size: calc(var(--s-head-scale) * clamp(44px, 9.2cqi, 148px));
                line-height: 0.96;
            }

            .made {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 4px 20px;
                margin-top: 20px;
                font-size: 13px;
            }

            @container site (min-width: 860px) {
                .cols {
                    grid-template-columns: minmax(0, 4fr) minmax(0, 4fr) minmax(0, 4fr);
                    gap: clamp(24px, 4cqi, 64px);
                }

                .social {
                    grid-column: 1 / -1;
                }
            }
        `
    ]
})
export class ModernFooterComponent extends SiteSection {}
