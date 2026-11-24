import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE, SECTION_KIT } from '../../section-base';
import { SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent } from '../../site-parts.component';

/**
 * Premium: koyu bantta davetiye düzeni. Adres büyük tırnaklı yazıyla; telefon normal ölçüde düğmede (K-01). İnce çerçeveli kartta bugünü
 * işaretli saatler ve "Haritada aç".
 */
@Component({
    selector: 'site-premium-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent],
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
                    <p class="muted intro s-head">{{ v.copy.contactText }}</p>
                    <div class="links">
                        @if (v.telHref) {
                            <a class="btn main" [href]="v.telHref"><site-icon name="phone" />{{ v.phone }}</a>
                        }
                        @if (v.whatsappHref) {
                            <a class="btn line" [href]="v.whatsappHref" target="_blank" rel="noopener"><site-icon name="message" />WhatsApp</a>
                        }
                        @if (v.mailHref) {
                            <a class="btn line" [href]="v.mailHref"><site-icon name="mail" />E-posta</a>
                        }
                    </div>
                </div>
                <div class="frame">
                    @if (v.hasHours) {
                        <h3 class="kick">Çalışma saatleri</h3>
                        <p class="now"><site-status [strong]="true" /></p>
                        <site-hours class="hours" />
                    }
                    <site-map class="map" />
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
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

            .frame {
                align-self: start;
                padding: clamp(20px, 3cqi, 36px);
                border: 1px solid var(--s-primary-text);
            }

            .frame .kick {
                margin-bottom: 8px;
            }

            .now {
                margin-bottom: 4px;
                color: var(--s-muted);
            }

            .hours {
                margin-bottom: 20px;
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
