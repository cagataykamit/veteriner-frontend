import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE } from '../section-base';
import { SiteLogoComponent } from '../site-parts.component';

/**
 * Alt bilgi: yazı işareti, adres ve iletişim, sayfa bağlantıları; altta ad, sosyal hesaplar ve Vetinity ibaresi. İletişim sayfası
 * telefon, e-posta ve adresi zaten gösterdiği için orada alt bilgi bunları tekrar yazmaz (W-04).
 */
@Component({
    selector: 'site-footer',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <footer class="foot" [class.has-dock]="!!(v.bookingHref || v.telHref)">
            <div class="inner">
                <div class="top">
                    <div class="brand">
                        <site-logo />
                        @if (v.slogan) {
                            <p class="muted">{{ v.slogan }}</p>
                        }
                    </div>
                    @if (!site.onContactPage() && (v.address || v.telHref || v.mailHref)) {
                        <div class="info">
                            @if (v.address) {
                                <address class="muted">
                                    {{ v.address }}
                                    @if (v.location) {
                                        <br />{{ v.location }}
                                    }
                                </address>
                            }
                            @if (v.telHref) {
                                <a [href]="v.telHref">{{ v.phone }}</a>
                            }
                            @if (v.mailHref) {
                                <a [href]="v.mailHref">{{ v.email }}</a>
                            }
                        </div>
                    }
                    @if (v.menu.length) {
                        <nav class="links" aria-label="Alt menü">
                            @for (link of v.menu; track link.path) {
                                <a [siteLink]="link.path">{{ link.label }}</a>
                            }
                        </nav>
                    }
                </div>
                <div class="bottom">
                    <span>© {{ v.siteName }}</span>
                    @if (v.social.length) {
                        <span class="social">
                            @for (link of v.social; track link.key) {
                                <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
                            }
                        </span>
                    }
                    <span>Vetinity ile hazırlandı</span>
                </div>
            </div>
        </footer>
    `,
    styles: [
        SECTION_BASE,
        `
            .foot {
                padding-block: 36px 24px;
                border-top: 1px solid var(--s-line);
                font-size: 15px;
            }

            .top {
                display: grid;
                gap: 22px;
            }

            .brand {
                display: grid;
                align-content: start;
                gap: 10px;
                --wm-size: calc(var(--s-head-scale) * 22px);
            }

            .info {
                display: grid;
                align-content: start;
                justify-items: start;
            }

            address {
                margin-bottom: 4px;
                line-height: 1.55;
            }

            .info a,
            .links a,
            .bottom a,
            .bottom > span {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                text-decoration: none;
                overflow-wrap: anywhere;
            }

            .info a,
            .links a {
                min-width: 44px;
                font-weight: 500;
            }

            .links {
                display: flex;
                flex-wrap: wrap;
                gap: 0 22px;
            }

            .bottom {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 0 18px;
                margin-top: 20px;
                padding-top: 8px;
                border-top: 1px solid var(--s-line);
                color: var(--s-muted);
                font-size: 14px;
            }

            .social {
                display: inline-flex;
                flex-wrap: wrap;
                gap: 0 16px;
            }

            @container site (max-width: 899.98px) {
                .has-dock {
                    padding-bottom: 96px;
                }
            }

            @container site (min-width: 900px) {
                .foot {
                    padding-top: 48px;
                }

                .top {
                    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
                    gap: 40px;
                }

                .links {
                    display: grid;
                    grid-template-columns: repeat(2, max-content);
                    align-content: start;
                    gap: 0 28px;
                }
            }
        `
    ]
})
export class SiteFooterComponent extends SiteSection {}
