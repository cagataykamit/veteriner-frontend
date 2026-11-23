import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent } from '../../site-parts.component';

/**
 * Friendly: büyük renkli pano; "ara, yaz, gel" üç yuvarlak düğme (numara normal ölçüde, K-01), yanında açık renk kartta bugünü işaretli
 * saatler ve "Haritada aç".
 */
@Component({
    selector: 'site-friendly-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteIconComponent, SiteMapComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <div class="pano">
                    <div class="text">
                        <h2 class="h title s-head">{{ v.copy.contactTitle }}</h2>
                        <p class="intro s-head">{{ v.copy.contactText }}</p>
                        <div class="acts">
                            @if (v.telHref) {
                                <a class="big" [href]="v.telHref"><site-icon name="phone" />{{ v.phone }}</a>
                            }
                            @if (v.whatsappHref) {
                                <a class="big" [href]="v.whatsappHref" target="_blank" rel="noopener"><site-icon name="message" />WhatsApp'tan yazın</a>
                            }
                            @if (v.mailHref) {
                                <a class="big" [href]="v.mailHref"><site-icon name="mail" />{{ v.email }}</a>
                            }
                        </div>
                        @if (v.address || v.location) {
                            <address>
                                {{ v.address }}
                                @if (v.address && v.location) {
                                    <br />
                                }
                                {{ v.location }}
                            </address>
                        }
                    </div>
                    <div class="card">
                        @if (v.hasHours) {
                            <h3 class="h sub">Çalışma saatleri</h3>
                            <p class="now"><site-status [strong]="true" /></p>
                            <site-hours class="hours" />
                        }
                        <site-map />
                    </div>
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .text {
                --s-ink: var(--s-on-accent);
                --s-muted: var(--s-on-accent);
                --s-line: color-mix(in srgb, var(--s-on-accent) 30%, transparent);
                --s-primary-text: var(--s-on-accent);
                --s-focus: var(--s-on-accent);
            }

            .pano {
                display: grid;
                gap: 24px;
                padding: 24px 18px;
                border-radius: calc(var(--s-radius-img) + 8px);
                background: var(--s-accent);
                color: var(--s-on-accent);
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .intro {
                max-width: 36ch;
                margin-top: 10px;
                font-size: 18px;
                line-height: 1.45;
            }

            .acts {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 20px;
            }

            .big {
                display: flex;
                align-items: center;
                gap: 12px;
                min-height: 56px;
                padding: 0 20px;
                overflow: hidden;
                border-radius: var(--s-radius-btn);
                background: var(--s-on-accent);
                color: var(--s-accent);
                font-size: 17px;
                font-weight: 700;
                overflow-wrap: anywhere;
                text-decoration: none;
                transition: transform 0.2s ease;
            }

            .big:hover {
                transform: translateX(3px);
            }

            address {
                margin-top: 18px;
                font-size: 16px;
                line-height: 1.45;
            }

            .card {
                align-self: start;
                padding: 22px 20px;
                border-radius: var(--s-radius-img);
                background: var(--s-bg);
                color: var(--s-ink);
            }

            .sub {
                font-size: calc(var(--s-head-scale) * 24px);
            }

            .now {
                margin-top: 6px;
                color: var(--s-muted);
            }

            .hours {
                margin-block: 6px 18px;
            }

            @container site (min-width: 860px) {
                .pano {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    gap: clamp(24px, 4cqi, 64px);
                    padding: clamp(28px, 4cqi, 56px);
                }
            }
        `
    ]
})
export class FriendlyContactComponent extends SiteSection {}
