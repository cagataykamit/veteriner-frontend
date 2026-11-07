import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { NAV_BASE, SECTION_BASE } from '../../section-base';
import { SiteLogoComponent } from '../../site-parts.component';

/** Premium: logo ortada, bağlantılar iki yanda; küçük, aralıklı büyük harf. Mobilde tam ekran ortalı liste. */
@Component({
    selector: 'site-premium-nav',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteLogoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <header class="nav" siteNavFit [class.is-left]="!v.logoCenter">
            <div class="bar" data-fit-bar>
                <button type="button" class="burger" [attr.aria-expanded]="open()" (click)="open.set(!open())">{{ open() ? 'Kapat' : 'Menü' }}</button>
                <nav class="links start" data-fit="a" aria-label="Site menüsü">
                    @for (link of leftLinks(); track link.path) {
                        <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                    }
                </nav>
                <a class="home" data-fit="home" siteLink="/" [attr.aria-label]="v.name + ', ana sayfa'">
                    <site-logo [size]="30" [showName]="false" />
                    <span class="h name">{{ v.name }}</span>
                </a>
                <div class="right">
                    <nav class="links end" data-fit="b" aria-label="Site menüsü, devam">
                        @for (link of rightLinks(); track link.path) {
                            <a [siteLink]="link.path" [attr.aria-current]="site.page() === link.path ? 'page' : null">{{ link.label }}</a>
                        }
                    </nav>
                    @if (v.cta; as cta) {
                        <a siteCta class="call" data-fit="b">{{ cta.label }}</a>
                    }
                </div>
            </div>
            @if (open()) {
                <nav class="panel" aria-label="Site menüsü" (click)="open.set(false)">
                    @for (link of v.menu; track link.path) {
                        <a class="h" [siteLink]="link.path">{{ link.label }}</a>
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
                grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);
                align-items: center;
                min-height: 68px;
                padding-inline: calc(var(--s-gutter) - 10px);
            }

            .burger {
                justify-self: start;
                font-size: 12px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            .home {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                min-height: 44px;
                text-decoration: none;
            }

            .name {
                display: none;
                overflow: hidden;
                font-size: calc(var(--s-head-scale) * 19px);
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .links {
                display: none;
            }

            .right {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 20px;
            }

            .call {
                display: none;
                align-items: center;
                flex: none;
                min-height: 44px;
                padding: 0 10px;
                color: var(--s-accent-text);
                font-size: 12px;
                letter-spacing: 0.14em;
                text-decoration: none;
                text-transform: uppercase;
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
                min-height: 52px;
                font-size: calc(var(--s-head-scale) * 30px);
                text-decoration: none;
            }

            @container site (min-width: 760px) {
                .bar {
                    gap: 28px;
                    padding-inline: var(--s-gutter);
                }

                .call {
                    display: inline-flex;
                }

                .name {
                    display: inline;
                }

                .burger,
                .panel {
                    display: none;
                }

                .is-tight .burger {
                    display: inline-flex;
                }

                .is-tight .panel {
                    display: flex;
                }

                .is-tight .links {
                    position: absolute;
                    visibility: hidden;
                }

                .links {
                    display: flex;
                    gap: 18px;
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

                .is-left .home {
                    grid-column: 1;
                    grid-row: 1;
                }

                .is-left .links.start {
                    grid-column: 2;
                    grid-row: 1;
                    justify-content: flex-end;
                }

                .is-left .right {
                    grid-column: 3;
                    grid-row: 1;
                }

                .is-left.is-tight .bar {
                    grid-template-columns: minmax(0, 1fr) auto auto;
                }

                .is-left.is-tight .right {
                    grid-column: 2;
                }

                .is-left.is-tight .burger {
                    grid-column: 3;
                    grid-row: 1;
                }
            }
        `
    ]
})
export class PremiumNavComponent extends SiteSection {
    protected readonly open = signal(false);
    /** Sağda eylem düğmesi de var; sol taraf bir bağlantı fazla alınca iki yan dengelenir. */
    private readonly middle = computed(() => Math.ceil(this.vm().menu.length / 2));
    protected readonly leftLinks = computed(() => this.vm().menu.slice(0, this.middle()));
    protected readonly rightLinks = computed(() => this.vm().menu.slice(this.middle()));
}
