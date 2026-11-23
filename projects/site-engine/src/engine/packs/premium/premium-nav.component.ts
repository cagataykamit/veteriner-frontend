import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE, SECTION_KIT } from '../../section-base';
import { SiteIconComponent, SiteLogoComponent } from '../../site-parts.component';

/**
 * Premium: yazı işareti ortada, ana bağlantılar iki yanda; küçük, aralıklı büyük harf. Geniş ekranda en çok beş ana bağlantı, kalanı
 * "Diğer"de (`NAV_BASE`). Telefonda tam ekran ortalı liste.
 */
@Component({
    selector: 'site-premium-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" siteNavFit [class.is-left]="!v.logoCenter" [class.has-more]="v.navMore.length > 0">
            <div class="bar" data-fit-bar>
                <nav class="links start" data-fit="a" aria-label="Site menüsü">
                    @for (link of leftLinks(); track link.path) {
                        <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo /></a>
                <div class="right">
                    <nav class="links end" data-fit="b" aria-label="Site menüsü, devam">
                        @for (link of rightLinks(); track link.path) {
                            <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                        }
                    </nav>
                    @if (v.cta; as cta) {
                        <a siteCta class="btn line call" data-fit="b">{{ cta.label }}</a>
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
                    @for (link of v.navPrimary; track link.path) {
                        <a class="h prim" [siteLink]="link.path">{{ link.label }}</a>
                    }
                    @for (link of v.navMore; track link.path) {
                        <a class="h" [siteLink]="link.path">{{ link.label }}</a>
                    }
                </nav>
            }
        </header>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        NAV_BASE,
        `
            .nav {
                position: sticky;
                top: 0;
                z-index: 20;
                border-bottom: 1px solid var(--s-line);
                background: var(--s-bg);
                color: var(--s-ink);
                --wm-size: calc(var(--s-head-scale) * 19px);
            }

            .bar {
                display: grid;
                grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);
                align-items: center;
                gap: 12px;
                min-height: 68px;
                padding-inline: var(--s-gutter);
            }

            .home {
                display: inline-flex;
                grid-area: 1 / 2;
                align-items: center;
                min-width: 0;
                min-height: 44px;
                text-decoration: none;
            }

            .right {
                display: flex;
                grid-area: 1 / 3;
                align-items: center;
                justify-content: flex-end;
                gap: 20px;
            }

            .is-left .bar {
                grid-template-columns: minmax(0, 1fr) auto;
            }

            .is-left .home {
                grid-area: 1 / 1;
            }

            .is-left .right {
                grid-area: 1 / 2;
            }

            .links,
            .btn.call {
                display: none;
            }

            .burger {
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            .btn.call {
                min-height: 44px;
                padding: 0 18px;
                border-color: var(--s-accent-text);
                color: var(--s-accent-text);
            }
        `,
        `
            .panel {
                position: absolute;
                top: 100%;
                right: 0;
                left: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                height: calc(var(--s-vh) - 69px);
                padding: 32px var(--s-gutter);
                overflow-y: auto;
                background: var(--s-bg);
            }

            .panel a {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 44px;
                min-height: 52px;
                font-size: calc(var(--s-head-scale) * 30px);
                text-decoration: none;
            }

            @container site (min-width: 900px) {
                .bar {
                    gap: 28px;
                }

                .btn.call {
                    display: inline-flex;
                }

                .links {
                    display: flex;
                    gap: 18px;
                }

                .links.start {
                    grid-area: 1 / 1;
                }

                .links a {
                    display: inline-flex;
                    align-items: center;
                    min-height: 44px;
                    font-size: 12px;
                    letter-spacing: 0.14em;
                    text-decoration: none;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .links a:hover,
                .links a[aria-current] {
                    color: var(--s-accent-text);
                }

                .is-left .bar {
                    grid-template-columns: auto minmax(0, 1fr) auto;
                }

                .is-left .links.start {
                    grid-area: 1 / 2;
                    justify-content: flex-end;
                }

                .is-left .right {
                    grid-area: 1 / 3;
                }

                /* "Diğer" listesi çubuğun altında, sayfayı kaplamadan açılır. */
                .panel {
                    height: auto;
                    padding-block: 20px 28px;
                    border-bottom: 1px solid var(--s-line);
                }

                .panel a {
                    font-size: calc(var(--s-head-scale) * 24px);
                }
            }
        `
    ]
})
export class PremiumNavComponent extends SiteSection {
    protected readonly open = signal(false);
    /** Sağda eylem düğmesi de var; sol taraf bir bağlantı fazla alınca iki yan dengelenir. */
    private readonly middle = computed(() => Math.ceil(this.vm().navPrimary.length / 2));
    protected readonly leftLinks = computed(() => this.vm().navPrimary.slice(0, this.middle()));
    protected readonly rightLinks = computed(() => this.vm().navPrimary.slice(this.middle()));
}
