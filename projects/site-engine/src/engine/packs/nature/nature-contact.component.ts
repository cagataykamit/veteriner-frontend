import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE, SECTION_KIT } from '../../section-base';
import { SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent } from '../../site-parts.component';

/**
 * Nature: kemerli pencerede bugünü işaretli saatler; yanında sakin bir yazı, adres, telefon düğmesi (numara normal ölçüde, K-01) ve
 * "Haritada aç".
 */
@Component({
    selector: 'site-nature-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid" [class.no-hours]="!v.hasHours">
                @if (v.hasHours) {
                    <div class="window">
                        <h3 class="h sub">Çalışma saatleri</h3>
                        <p class="now"><site-status [strong]="true" /></p>
                        <site-hours />
                    </div>
                }
                <div>
                    <h2 class="h title s-head">{{ v.copy.contactTitle }}</h2>
                    <p class="intro s-head">{{ v.copy.contactText }}</p>
                    @if (v.address || v.location) {
                        <address class="addr">
                            {{ v.address }}
                            @if (v.address && v.location) {
                                <br />
                            }
                            {{ v.location }}
                        </address>
                    }
                    <p class="acts">
                        @if (v.telHref) {
                            <a class="btn main" [href]="v.telHref"><site-icon name="phone" />{{ v.phone }}</a>
                        }
                        @if (v.whatsappHref) {
                            <a class="btn line" [href]="v.whatsappHref" target="_blank" rel="noopener"><site-icon name="message" />WhatsApp</a>
                        }
                        @if (v.mailHref) {
                            <a class="btn line" [href]="v.mailHref"><site-icon name="mail" />E-posta</a>
                        }
                    </p>
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
                gap: 32px;
            }

            .window {
                padding: clamp(56px, 8cqi, 96px) clamp(22px, 3.4cqi, 44px) clamp(26px, 3cqi, 40px);
                border-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
                background: var(--s-tint);
                color: var(--s-on-tint);
                --s-muted: var(--s-tint-muted);
            }

            /* "Bugün" işareti pencerenin yumuşak zemininde kaybolmasın. */
            .window site-hours {
                --s-tint: var(--s-bg);
            }

            .sub {
                font-size: calc(var(--s-head-scale) * 28px);
                font-style: italic;
                text-align: center;
            }

            .now {
                margin-block: 8px 10px;
                color: var(--s-muted);
                text-align: center;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            .intro {
                max-width: 40ch;
                margin-top: 14px;
                font-size: 18px;
                line-height: 1.5;
            }

            .addr {
                margin-top: 18px;
                font-family: var(--s-head);
                font-size: calc(var(--s-head-scale) * 22px);
                line-height: 1.3;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
                margin-top: 22px;
            }

            .map {
                max-width: 520px;
                margin-top: 22px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    align-items: center;
                    gap: clamp(40px, 8cqi, 128px);
                }

                .grid.no-hours {
                    grid-template-columns: minmax(0, 760px);
                }
            }
        `
    ]
})
export class NatureContactComponent extends SiteSection {}
