import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteMapComponent } from '../../site-parts.component';

/** Premium: koyu bantta davetiye düzeni. Adres büyük tırnaklı yazıyla, saatler tablo, konum çizimi ince çerçeveli. */
@Component({
    selector: 'site-premium-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteMapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec band">
            <div class="inner grid">
                <div class="text">
                    <h2 class="kick s-head">{{ v.copy.contactTitle }}</h2>
                    @if (v.address) {
                        <address class="h addr">{{ v.address }}</address>
                        <p class="muted loc">{{ v.location }}</p>
                    }
                    <p class="muted intro">{{ v.copy.contactText }}</p>
                    <div class="links">
                        @if (v.telHref) {
                            <a class="btn main" [href]="v.telHref">{{ v.phone }}</a>
                        }
                        @if (v.mailHref) {
                            <a class="btn line" [href]="v.mailHref">E-posta</a>
                        }
                    </div>
                    <site-hours class="hours" />
                </div>
                <div class="frame"><site-map /></div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .grid {
                display: grid;
                gap: 36px;
            }

            .kick {
                margin-bottom: 20px;
                color: var(--s-accent-text);
                font-size: 12px;
                font-weight: 400;
                letter-spacing: 0.2em;
                text-transform: uppercase;
            }

            .addr {
                font-size: calc(var(--s-head-scale) * clamp(32px, 4.2cqi, 64px));
            }

            .loc {
                margin-top: 10px;
                font-size: 16px;
            }

            .intro {
                max-width: 40ch;
                margin-top: 20px;
                font-size: 16px;
                line-height: 1.55;
            }

            .links {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 24px;
            }

            .hours {
                margin-top: 28px;
            }

            .frame {
                min-height: 340px;
                padding: 10px;
                border: 1px solid var(--s-primary-text);
            }

            site-map {
                height: 100%;
                --s-map-radius: 0;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
                    gap: clamp(48px, 7cqi, 112px);
                }
            }
        `
    ]
})
export class PremiumContactComponent extends SiteSection {}
