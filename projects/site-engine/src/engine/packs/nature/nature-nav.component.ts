import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE } from '../../section-base';
import { SiteLogoComponent, SiteStatusComponent } from '../../site-parts.component';

/** Nature: üstte neredeyse hiçbir şey yok; her genişlikte "Menü", sağdan açılan ferah panel. Panelde başlık yok. */
@Component({
    selector: 'site-nature-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteLogoComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" [class.is-center]="v.logoCenter">
            <div class="bar">
                <site-status class="status" [showDetail]="false" />
                <a class="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo [size]="36" /></a>
                <div class="end">
                    @if (v.cta; as cta) {
                        <a siteCta class="tlink cta">{{ cta.label }}</a>
                    }
                    <button type="button" class="burger" [attr.aria-expanded]="open()" (click)="open.set(true)">Menü</button>
                </div>
            </div>
            @if (open()) {
                <button type="button" class="scrim" aria-label="Menüyü kapat" (click)="open.set(false)"></button>
                <aside class="drawer" (click)="open.set(false)">
                    <button type="button" class="burger close">Kapat</button>
                    <nav aria-label="Site menüsü">
                        @for (link of v.menu; track link.path) {
                            <a class="h" [siteLink]="link.path">{{ link.label }}</a>
                        }
                    </nav>
                    @if (v.telHref) {
                        <a class="tel" [href]="v.telHref">{{ v.phone }}</a>
                    }
                </aside>
            }
        </header>
    `,
    styles: [
        SECTION_BASE,
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

            .status,
            .cta {
                display: none;
            }

            .end {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .burger {
                padding: 0 18px;
                border: 1px solid var(--s-line);
                border-radius: 999px;
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
                min-height: 44px;
                margin-top: auto;
                padding-top: 16px;
                font-size: 18px;
                font-variant-numeric: tabular-nums;
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

            @container site (min-width: 860px) {
                .bar {
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                }

                .home {
                    grid-column: 1;
                    grid-row: 1;
                }

                .status {
                    display: none;
                }

                .end {
                    grid-column: 3;
                    justify-content: flex-end;
                }

                .is-center .home {
                    grid-column: 2;
                }

                .is-center .status {
                    display: inline-flex;
                    grid-column: 1;
                    grid-row: 1;
                }

                .cta {
                    display: inline-flex;
                }
            }
        `
    ]
})
export class NatureNavComponent extends SiteSection {
    protected readonly open = signal(false);
}
