import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE, SECTION_KIT } from '../../section-base';
import { SiteIconComponent, SiteLogoComponent } from '../../site-parts.component';

/**
 * Nature: üstte az şey var; geniş ekranda sakin, aralıklı en çok beş ana bağlantı ve yumuşak köşeli randevu düğmesi, kalanı "Diğer"de
 * (`NAV_BASE`). Telefonda "Menü"; liste sağdan açılan ferah paneldir. Panelde başlık yok.
 */
@Component({
    selector: 'site-nature-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" siteNavFit [class.is-center]="v.logoCenter" [class.has-more]="v.navMore.length > 0">
            <div class="bar" data-fit-bar>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo /></a>
                <nav class="links" data-fit="a" aria-label="Site menüsü">
                    @for (link of v.navPrimary; track link.path) {
                        <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <div class="end">
                    @if (v.cta; as cta) {
                        <a siteCta class="btn main cta" data-fit="b">{{ cta.label }}</a>
                    }
                    @if (v.menu.length) {
                        <button type="button" class="burger" data-fit="b" [attr.aria-expanded]="open()" (click)="open.set(true)">
                            <span class="say-all">Menü</span><span class="say-more">Diğer</span>
                        </button>
                    }
                </div>
            </div>
            @if (open()) {
                <button type="button" class="scrim panel" aria-label="Menüyü kapat" (click)="open.set(false)"></button>
                <aside class="drawer panel" (click)="open.set(false)">
                    <button type="button" class="burger close"><site-icon name="close" />Kapat</button>
                    <nav aria-label="Site menüsü">
                        @for (link of v.navPrimary; track link.path) {
                            <a class="h prim" [siteLink]="link.path">{{ link.label }}</a>
                        }
                        @for (link of v.navMore; track link.path) {
                            <a class="h" [siteLink]="link.path">{{ link.label }}</a>
                        }
                    </nav>
                    @if (v.telHref) {
                        <a class="tel" [href]="v.telHref"><site-icon name="phone" />{{ v.phone }}</a>
                    }
                </aside>
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
                background: var(--s-bg);
                color: var(--s-ink);
            }

            .bar {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: 12px;
                min-height: 72px;
                padding-inline: var(--s-gutter);
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
                gap: 16px;
            }

            .burger {
                padding: 0 18px;
                border: 1px solid var(--s-line-strong);
                border-radius: var(--s-radius-btn);
            }

            .scrim {
                position: absolute;
                top: 0;
                right: 0;
                left: 0;
                height: var(--s-vh);
                border: 0;
                background: color-mix(in srgb, var(--s-ink) 40%, transparent);
                cursor: pointer;
            }

            .drawer {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                width: min(440px, 100%);
                height: var(--s-vh);
                padding: 16px var(--s-gutter) 28px;
                overflow-y: auto;
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

            .close {
                align-self: flex-end;
                margin-bottom: 20px;
            }
        `,
        `
            .drawer nav {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .drawer nav a {
                display: inline-flex;
                align-items: center;
                min-height: 52px;
                font-size: calc(var(--s-head-scale) * 34px);
                text-decoration: none;
            }

            .drawer nav a:hover {
                font-style: italic;
            }

            .tel {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                min-height: 44px;
                margin-top: auto;
                padding-top: 16px;
                font-size: 18px;
                font-variant-numeric: tabular-nums;
                text-decoration: none;
            }

            @media (prefers-reduced-motion: no-preference) {
                .drawer {
                    animation: nature-slide 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both;
                }
            }

            @keyframes nature-slide {
                from {
                    transform: translateX(32px);
                    opacity: 0;
                }
            }

            @container site (min-width: 900px) {
                .bar {
                    grid-template-columns: auto minmax(0, 1fr) auto;
                    gap: 32px;
                }

                .links {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0 26px;
                    min-width: 0;
                }

                .links a {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 44px;
                    min-height: 44px;
                    font-size: 15px;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .links a:hover,
                .links a[aria-current] {
                    color: var(--s-primary-text);
                    font-style: italic;
                }

                .cta {
                    display: inline-flex;
                    min-height: 44px;
                    padding: 0 22px;
                    font-size: 15px;
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

                .is-center .end {
                    justify-content: flex-end;
                }

                .is-tight .bar {
                    grid-template-columns: minmax(0, 1fr) auto;
                }
            }
        `
    ]
})
export class NatureNavComponent extends SiteSection {
    protected readonly open = signal(false);
}
