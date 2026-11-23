import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent, SiteLogoComponent, SiteStatusComponent } from '../site-parts.component';

/**
 * Üst çubuk (K-01, B'nin üst kısmı): giriş bölümüyle aynı yumuşak zeminde yazı işareti, menü, durum ve ana eylem. Online randevu açıksa
 * eylem "Randevu al", kapalıysa numaralı telefon düğmesidir. Bağlantılar sığmazsa (`siteNavFit`) ya da ekran darsa "Menü" açılır.
 * Logo ortada seçildiyse geniş ekranda bağlantılar sola, eylem sağa geçer.
 */
@Component({
    selector: 'site-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteLogoComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav tinted" siteNavFit [class.is-center]="v.logoCenter">
            <div class="inner bar" data-fit-bar>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo /></a>
                <nav class="links" data-fit="a" aria-label="Site menüsü">
                    @for (link of v.menu; track link.path) {
                        <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <div class="end">
                    @if (v.hasHours) {
                        <site-status class="status" data-fit="b" />
                    }
                    @if (v.bookingHref) {
                        <a class="btn main act" data-fit="b" [href]="v.bookingHref">{{ v.copy.ctaPrimary }}</a>
                    } @else if (v.telHref) {
                        <a class="btn main act" data-fit="b" [href]="v.telHref"><site-icon name="phone" />{{ v.phone }}</a>
                    }
                    @if (v.menu.length) {
                        <button type="button" class="burger" [attr.aria-expanded]="open()" (click)="open.set(!open())">
                            <site-icon [name]="open() ? 'close' : 'menu'" />{{ open() ? 'Kapat' : 'Menü' }}
                        </button>
                    }
                </div>
            </div>
            @if (open()) {
                <nav class="panel" aria-label="Site menüsü" (click)="open.set(false)">
                    <div class="inner">
                        @for (link of v.menu; track link.path) {
                            <a [siteLink]="link.path">{{ link.label }}</a>
                        }
                    </div>
                </nav>
            }
        </header>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .nav {
                position: sticky;
                top: 0;
                z-index: 20;
            }

            .bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                min-height: 64px;
            }

            .home {
                display: inline-flex;
                align-items: center;
                min-width: 0;
                min-height: 44px;
                text-decoration: none;
            }

            .links,
            .status,
            .act {
                display: none;
            }

            .end {
                display: flex;
                flex: none;
                align-items: center;
                gap: 16px;
            }

            .burger {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                padding: 0 16px;
                border: 0;
                border-radius: var(--s-radius-btn);
                background: var(--s-bg);
                color: var(--s-ink);
                font: 600 15px/1 var(--s-body);
                cursor: pointer;
            }

            .panel {
                position: absolute;
                top: 100%;
                right: 0;
                left: 0;
                padding-bottom: 12px;
                border-top: 1px solid var(--s-line);
                background: var(--s-tint);
                box-shadow: 0 12px 24px rgb(0 0 0 / 8%);
            }

            .panel a {
                display: flex;
                align-items: center;
                min-height: 48px;
                border-bottom: 1px solid var(--s-line);
                font-weight: 500;
                text-decoration: none;
            }
        `,
        `
            @container site (min-width: 900px) {
                .bar {
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr) auto;
                    gap: 28px;
                    min-height: 76px;
                    --wm-size: calc(var(--s-head-scale) * 22px);
                }

                .links {
                    display: flex;
                    justify-content: center;
                    gap: 0 24px;
                    min-width: 0;
                }

                .links a {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 44px;
                    min-height: 44px;
                    font-size: 15px;
                    font-weight: 500;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .links a:hover,
                .links a[aria-current='page'] {
                    color: var(--s-primary-text);
                }

                .status {
                    display: inline-flex;
                    color: var(--s-muted);
                    white-space: nowrap;
                }

                .act {
                    display: inline-flex;
                    min-height: 44px;
                    padding: 0 20px;
                }

                .burger,
                .panel {
                    display: none;
                }

                .is-center .bar {
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                }

                .is-center .home {
                    grid-area: 1 / 2;
                }

                .is-center .links {
                    grid-area: 1 / 1;
                    justify-content: flex-start;
                }

                .is-center .end {
                    grid-area: 1 / 3;
                    justify-self: end;
                }

                .is-tight .links {
                    position: absolute;
                    visibility: hidden;
                }

                .is-tight .end {
                    grid-column: 3;
                }

                .is-tight .burger {
                    display: inline-flex;
                }

                .is-tight .panel {
                    display: block;
                }

                .panel .inner {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    column-gap: 32px;
                }
            }
        `
    ]
})
export class SiteNavComponent extends SiteSection {
    protected readonly open = signal(false);
}
