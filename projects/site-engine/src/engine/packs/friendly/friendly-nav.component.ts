import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE, SECTION_KIT } from '../../section-base';
import { SiteIconComponent, SiteLogoComponent } from '../../site-parts.component';

/**
 * Friendly: sayfanın üstünde yüzen yuvarlak kapsül; açılan menü de yuvarlak bir sayfa. Geniş ekranda en çok beş ana bağlantı, kalanı
 * "Diğer"de (`NAV_BASE`).
 */
@Component({
    selector: 'site-friendly-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" siteNavFit [class.has-more]="v.navMore.length > 0">
            <div class="pill" data-fit-bar [class.is-center]="v.logoCenter">
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo /></a>
                <nav class="links" data-fit="a" aria-label="Site menüsü">
                    @for (link of v.navPrimary; track link.path) {
                        <a [siteLink]="link.path" [class.is-on]="site.page() === link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <div class="end">
                    @if (v.cta; as cta) {
                        <a siteCta class="btn main cta" data-fit="b">{{ cta.label }}</a>
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
                <nav class="sheet panel" aria-label="Site menüsü" (click)="open.set(false)">
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
                padding: 10px clamp(10px, 2cqi, 28px) 0;
                color: var(--s-ink);
                pointer-events: none;
            }

            .pill,
            .sheet {
                pointer-events: auto;
            }

            .pill {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: 8px;
                max-width: 1320px;
                min-height: 60px;
                margin-inline: auto;
                padding: 8px 8px 8px 12px;
                border: 1px solid var(--s-line);
                border-radius: calc(var(--s-radius) + 12px);
                background: var(--s-bg);
                box-shadow: 0 8px 24px color-mix(in srgb, var(--s-ink) 10%, transparent);
            }

            .home {
                display: inline-flex;
                align-items: center;
                min-width: 0;
                min-height: 44px;
                text-decoration: none;
            }

            .links,
            .cta {
                display: none;
            }

            .end {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .burger {
                padding: 0 16px;
                border-radius: var(--s-radius-btn);
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

        `,
        `
            .sheet {
                display: flex;
                flex-direction: column;
                max-height: calc(var(--s-vh) - 90px);
                margin-top: 8px;
                padding: 12px 20px;
                overflow-y: auto;
                border: 1px solid var(--s-line);
                border-radius: calc(var(--s-radius) + 12px);
                background: var(--s-bg);
                box-shadow: 0 16px 32px color-mix(in srgb, var(--s-ink) 16%, transparent);
            }

            .sheet a {
                display: flex;
                align-items: center;
                min-height: 52px;
                font-size: calc(var(--s-head-scale) * 24px);
                text-decoration: none;
            }

            @container site (min-width: 900px) {
                .pill {
                    grid-template-columns: auto minmax(0, 1fr) auto;
                    gap: 16px;
                }

                .nav:not(.is-tight) .is-center .home {
                    grid-column: 2;
                    grid-row: 1;
                    justify-self: center;
                }

                .nav:not(.is-tight) .is-center .links {
                    grid-column: 1;
                    grid-row: 1;
                }

                .links {
                    display: flex;
                    justify-content: center;
                    gap: 2px;
                }

                .links a {
                    display: inline-flex;
                    align-items: center;
                    min-height: 44px;
                    padding: 0 12px;
                    border-radius: var(--s-radius-btn);
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                    white-space: nowrap;
                    transition: background-color 0.2s ease;
                }

                .links a:hover,
                .links a.is-on {
                    background: var(--s-tint);
                    color: var(--s-on-tint);
                }

                .cta {
                    display: inline-flex;
                    min-height: 44px;
                    padding: 0 20px;
                    font-size: 14px;
                }

                .is-tight .pill {
                    grid-template-columns: minmax(0, 1fr) auto;
                }

                .is-tight .end {
                    justify-content: flex-end;
                }

                .end {
                    gap: 8px;
                }

                /* "Diğer" listesi kapsülün altında sağda, kısa bir kart olarak açılır. */
                .sheet {
                    max-width: 360px;
                    margin-left: auto;
                }
            }
        `
    ]
})
export class FriendlyNavComponent extends SiteSection {
    protected readonly open = signal(false);
}
