import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE } from '../../section-base';
import { SiteLogoComponent, SiteStatusComponent } from '../../site-parts.component';

/** Modern: ince çizgili tek satır; bağlantılar düz metin, açık bağlantının altında çizgi. Mobilde tam ekran büyük liste. */
@Component({
    selector: 'site-modern-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteLogoComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" siteNavFit [class.is-center]="v.logoCenter" [class.is-open]="open()">
            <div class="bar" data-fit-bar>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'"><site-logo [size]="34" /></a>
                <nav class="links" data-fit="a" aria-label="Site menüsü">
                    @for (link of v.menu; track link.path) {
                        <a [siteLink]="link.path" [class.is-on]="site.page() === link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <div class="end">
                    <site-status class="status" data-fit="b" [showDetail]="false" />
                    @if (v.cta; as cta) {
                        <a siteCta class="btn main cta" data-fit="b">{{ cta.label }}</a>
                    }
                    <button type="button" class="burger" [attr.aria-expanded]="open()" (click)="open.set(!open())">{{ open() ? 'Kapat' : 'Menü' }}</button>
                </div>
            </div>
            @if (open()) {
                <nav class="panel" aria-label="Site menüsü" (click)="open.set(false)">
                    @for (link of v.menu; track link.path; let i = $index) {
                        <a class="h" [siteLink]="link.path"><span>{{ (i + 1).toString().padStart(2, '0') }}</span>{{ link.label }}</a>
                    }
                    @if (v.telHref) {
                        <a class="tel" [href]="v.telHref">{{ v.phone }}</a>
                    }
                </nav>
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
                border-bottom: 1px solid var(--s-line);
                background: var(--s-bg);
                color: var(--s-ink);
            }

            .bar {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: 12px;
                min-height: 64px;
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
            .status,
            .cta {
                display: none;
            }

            .end {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .panel {
                position: absolute;
                top: 100%;
                right: 0;
                left: 0;
                display: flex;
                flex-direction: column;
                height: calc(var(--s-vh) - 65px);
                padding: 8px var(--s-gutter) 32px;
                overflow-y: auto;
                background: var(--s-bg);
            }

            .panel a.h {
                display: flex;
                align-items: baseline;
                gap: 14px;
                padding: 14px 0;
                border-bottom: 1px solid var(--s-line);
                font-size: 30px;
                text-decoration: none;
            }

            .panel a.h span {
                color: var(--s-muted);
                font: 500 13px/1 var(--s-body);
                font-variant-numeric: tabular-nums;
                letter-spacing: 0;
            }

            .tel {
                display: inline-flex;
                align-items: center;
                min-height: 48px;
                margin-top: 16px;
                font-size: 18px;
                font-weight: 600;
            }

            @container site (min-width: 1040px) {
                .bar {
                    grid-template-columns: auto minmax(0, 1fr) auto;
                    gap: 32px;
                }

                .is-center .bar {
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                }

                .is-center .home {
                    grid-column: 2;
                    grid-row: 1;
                }

                .is-center .links {
                    grid-column: 1;
                    grid-row: 1;
                    justify-content: flex-start;
                }

                .is-center .end {
                    justify-content: flex-end;
                }

                .links {
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                    min-width: 0;
                }

                .links a {
                    display: inline-flex;
                    align-items: center;
                    min-height: 44px;
                    padding: 0 10px;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .links a.is-on,
                .links a:hover {
                    text-decoration: underline;
                    text-decoration-thickness: 1px;
                    text-underline-offset: 6px;
                }

                .status {
                    display: inline-flex;
                    white-space: nowrap;
                }

                .cta {
                    display: inline-flex;
                    min-height: 44px;
                    padding: 0 18px;
                    font-size: 14px;
                }

                .burger,
                .panel {
                    display: none;
                }

                .is-tight:not(.is-center) .bar {
                    grid-template-columns: minmax(0, 1fr) auto;
                }

                .is-tight .links {
                    position: absolute;
                    visibility: hidden;
                }

                .is-tight .burger {
                    display: inline-flex;
                }

                .is-tight .panel {
                    display: flex;
                }
            }
        `
    ]
})
export class ModernNavComponent extends SiteSection {
    protected readonly open = signal(false);
}
