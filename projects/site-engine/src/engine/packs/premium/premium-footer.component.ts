import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteLogoComponent } from '../../site-parts.component';

/** Premium: ortalı, kartvizit sadeliğinde; ad tırnaklı, altında tek satırlık menü ve ince altın çizgi. */
@Component({
    selector: 'site-premium-footer',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <footer class="foot">
            <div class="inner box">
                <site-logo [size]="44" [showName]="false" />
                <p class="h name">{{ v.name }}</p>
                @if (v.slogan) {
                    <p class="muted slogan">{{ v.slogan }}</p>
                }
                <nav aria-label="Alt menü">
                    @for (link of v.menu; track link.path) {
                        <a [siteLink]="link.path">{{ link.label }}</a>
                    }
                </nav>
                <span class="rule" aria-hidden="true"></span>
                <p class="contact">
                    @if (v.telHref) {
                        <a [href]="v.telHref">{{ v.phone }}</a>
                    }
                    @if (v.mailHref) {
                        <a [href]="v.mailHref">{{ v.email }}</a>
                    }
                    @for (link of v.social; track link.key) {
                        <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
                    }
                </p>
                @if (v.address) {
                    <address class="muted">{{ v.address }}, {{ v.location }}</address>
                }
                <p class="made muted">© {{ v.siteName }} · Vetinity ile hazırlandı</p>
            </div>
        </footer>
    `,
    styles: [
        SECTION_BASE,
        `
            .foot {
                padding-block: clamp(48px, 7cqi, 96px) 24px;
                border-top: 1px solid var(--s-line);
                background: var(--s-bg);
                color: var(--s-ink);
            }

            .box {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .name {
                margin-top: 16px;
                font-size: calc(var(--s-head-scale) * clamp(32px, 4.4cqi, 64px));
            }

            .slogan {
                margin-top: 8px;
                font-size: 15px;
            }

            nav {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 0 22px;
                margin-top: 24px;
            }

            nav a,
            .contact a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                text-decoration: none;
            }

            nav a {
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            nav a:hover,
            .contact a:hover {
                color: var(--s-accent-text);
            }

            .rule {
                width: 64px;
                height: 1px;
                margin-block: 20px;
                background: var(--s-accent-text);
            }

            .contact {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 0 22px;
                font-size: 15px;
            }

            address {
                margin-top: 8px;
                font-size: 14px;
            }

            .made {
                margin-top: 32px;
                font-size: 12px;
            }
        `
    ]
})
export class PremiumFooterComponent extends SiteSection {}
