import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent } from '../site-parts.component';

/**
 * Saatler ve iletişim kartları: bugünün satırı işaretli saat tablosu; telefon, WhatsApp, e-posta ve adres normal ölçüde, tıklanır;
 * altında "Haritada aç" kartı. Klinik saat girmediyse yalnız iletişim kartı çizilir.
 */
@Component({
    selector: 'site-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.contactTitle }}</h2>
                    <p class="intro">{{ v.copy.contactText }}</p>
                </header>
                <div class="grid">
                    @if (v.hasHours) {
                        <div class="card box">
                            <h3 class="h sub">Çalışma saatleri</h3>
                            <p class="now"><site-status [strong]="true" /></p>
                            <site-hours />
                            @if (v.emergencyText) {
                                <p class="note">{{ v.emergencyText }}</p>
                            }
                        </div>
                    }
                    <div class="card box">
                        <h3 class="h sub">İletişim</h3>
                        <ul class="rows">
                            @if (v.telHref) {
                                <li>
                                    <site-icon name="phone" />
                                    <span><small>Telefon</small><a [href]="v.telHref">{{ v.phone }}</a></span>
                                </li>
                            }
                            @if (v.whatsappHref) {
                                <li>
                                    <site-icon name="message" />
                                    <span><small>WhatsApp</small><a [href]="v.whatsappHref" target="_blank" rel="noopener">Mesaj gönderin</a></span>
                                </li>
                            }
                            @if (v.mailHref) {
                                <li>
                                    <site-icon name="mail" />
                                    <span><small>E-posta</small><a [href]="v.mailHref">{{ v.email }}</a></span>
                                </li>
                            }
                            @if (v.address || v.location) {
                                <li>
                                    <site-icon name="pin" />
                                    <span>
                                        <small>Adres</small>
                                        <address>
                                            {{ v.address }}
                                            @if (v.address && v.location) {
                                                <br />
                                            }
                                            {{ v.location }}
                                        </address>
                                    </span>
                                </li>
                            }
                        </ul>
                        <site-map class="map" />
                    </div>
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
                gap: 16px;
            }

            .box {
                padding: 20px;
            }

            .sub {
                margin-bottom: 8px;
                font-size: calc(var(--s-head-scale) * 21px);
            }

            .now {
                margin-bottom: 4px;
                color: var(--s-muted);
            }

            .note {
                margin-top: 10px;
                color: var(--s-muted);
                font-size: 15px;
            }

            .rows li {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 12px 0;
                border-bottom: 1px solid var(--s-line);
            }

            .rows li:last-child {
                border-bottom: 0;
            }

            .rows site-icon {
                margin-top: 2px;
                color: var(--s-primary-text);
            }

            .rows span {
                min-width: 0;
            }

            small {
                display: block;
                color: var(--s-muted);
                font-size: 13.5px;
                line-height: 1.3;
            }

            .rows a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                font-size: 17px;
                font-weight: 600;
                text-decoration: none;
                overflow-wrap: anywhere;
            }

            .rows a:hover {
                color: var(--s-primary-text);
            }

            address {
                padding-top: 4px;
                line-height: 1.5;
            }

            .map {
                margin-top: 14px;
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
                    align-items: start;
                    gap: 24px;
                }

                .box {
                    padding: 28px;
                }
            }
        `
    ]
})
export class SiteContactComponent extends SiteSection {}
