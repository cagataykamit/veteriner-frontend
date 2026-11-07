import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: üstü yuvarlak dolgun renk blok; iri bir veda cümlesi ve sade bağlantılar. */
@Component({
    selector: 'site-friendly-footer',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <footer class="foot">
            <div class="inner">
                <p class="h bye">Görüşmek üzere.</p>
                <div class="cols">
                    <nav aria-label="Alt menü">
                        @for (link of v.menu; track link.path) {
                            <a [siteLink]="link.path">{{ link.label }}</a>
                        }
                    </nav>
                    <div class="reach">
                        @if (v.telHref) {
                            <a [href]="v.telHref">{{ v.phone }}</a>
                        }
                        @if (v.mailHref) {
                            <a [href]="v.mailHref">{{ v.email }}</a>
                        }
                        @for (link of v.social; track link.key) {
                            <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
                        }
                    </div>
                </div>
                <p class="made">© {{ v.siteName }} · Vetinity ile hazırlandı</p>
            </div>
        </footer>
    `,
    styles: [
        SECTION_BASE,
        `
            .foot {
                --s-focus: var(--s-on-primary);
                padding-block: clamp(40px, 6cqi, 80px) 20px;
                border-radius: calc(var(--s-radius-img) + 12px) calc(var(--s-radius-img) + 12px) 0 0;
                background: var(--s-primary);
                color: var(--s-on-primary);
            }

            .bye {
                font-size: calc(var(--s-head-scale) * clamp(48px, 10cqi, 160px));
            }

            .cols {
                display: grid;
                gap: 12px;
                margin-top: 28px;
            }

            nav,
            .reach {
                display: flex;
                flex-wrap: wrap;
                gap: 0 20px;
            }

            a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                font-weight: 500;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
                text-underline-offset: 4px;
            }

            .made {
                margin-top: 20px;
                font-size: 13px;
            }

            @container site (min-width: 860px) {
                .cols {
                    grid-template-columns: minmax(0, 1fr) auto;
                }
            }
        `
    ]
})
export class FriendlyFooterComponent extends SiteSection {}
