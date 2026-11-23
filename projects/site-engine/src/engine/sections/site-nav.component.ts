import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent, SiteLogoComponent, SiteStatusComponent } from '../site-parts.component';

/**
 * Üst çubuk (K-01, B'nin üst kısmı): giriş bölümüyle aynı yumuşak zeminde yazı işareti, menü, durum ve ana eylem. Online randevu açıksa
 * eylem "Randevu al", kapalıysa numaralı telefon düğmesidir. Geniş ekranda yalnız ana bağlantılar (`navPrimary`) açık durur, kalanı
 * "Diğer" altındadır. Ana bağlantılar da sığmazsa (`siteNavFit`) ya da ekran darsa hepsi "Menü"dedir. Logo ortada seçildiyse geniş
 * ekranda bağlantılar sola, eylem sağa geçer; sığmazsa logo yine sola döner, öğeler üst üste binmez.
 */
@Component({
    selector: 'site-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteLogoComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav tinted" siteNavFit [class.is-center]="v.logoCenter" [class.has-more]="v.navMore.length > 0">
            <div class="inner bar" data-fit-bar>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo /></a>
                <nav class="links" data-fit="a" aria-label="Site menüsü">
                    @for (link of v.navPrimary; track link.path) {
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
                        <button type="button" class="burger" data-fit="b" [attr.aria-expanded]="open()" (click)="open.set(!open())">
                            <site-icon [name]="open() ? 'close' : 'menu'" />
                            @if (open()) {
                                Kapat
                            } @else {
                                <span class="say-all">Menü</span><span class="say-more">Diğer</span>
                            }
                        </button>
                    }
                </div>
            </div>
            @if (open()) {
                <nav class="panel" aria-label="Site menüsü" (click)="open.set(false)">
                    <div class="inner">
                        @for (link of v.navPrimary; track link.path) {
                            <a class="prim" [siteLink]="link.path">{{ link.label }}</a>
                        }
                        @for (link of v.navMore; track link.path) {
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
                flex: none;
                align-items: center;
                white-space: nowrap;
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

            .burger .say-more {
                display: none;
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

                .is-center:not(.is-tight) .bar {
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                }

                .is-center:not(.is-tight) .home {
                    grid-area: 1 / 2;
                }

                .is-center:not(.is-tight) .links {
                    grid-area: 1 / 1;
                    justify-content: flex-start;
                }

                .is-center:not(.is-tight) .end {
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

                .has-more .burger,
                .is-tight .burger {
                    display: inline-flex;
                }

                .has-more .panel,
                .is-tight .panel {
                    display: block;
                }

                /* Ana bağlantılar çubukta açıkken düğme "Diğer"dir ve yalnız kalanları listeler. */
                .has-more:not(.is-tight) .burger .say-all,
                .has-more:not(.is-tight) .panel .prim {
                    display: none;
                }

                .has-more:not(.is-tight) .burger .say-more {
                    display: inline;
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
