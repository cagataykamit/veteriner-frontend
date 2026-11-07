import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteMapComponent } from '../../site-parts.component';

/** Friendly: büyük renkli pano; "ara, yaz, gel" üç iri düğme, yanında yuvarlak harita ve saatler. */
@Component({
    selector: 'site-friendly-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteMapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <div class="pano">
                    <div class="text">
                        <h2 class="h title s-head">{{ v.copy.contactTitle }}</h2>
                        <p class="intro">{{ v.copy.contactText }}</p>
                        <div class="acts">
                            @if (v.telHref) {
                                <a class="big" [href]="v.telHref"><i class="pi pi-phone" aria-hidden="true"></i>{{ v.phone }}</a>
                            }
                            @if (v.whatsappHref) {
                                <a class="big" [href]="v.whatsappHref" target="_blank" rel="noopener"><i class="pi pi-whatsapp" aria-hidden="true"></i>WhatsApp'tan yazın</a>
                            }
                            @if (v.mailHref) {
                                <a class="big" [href]="v.mailHref"><i class="pi pi-envelope" aria-hidden="true"></i>{{ v.email }}</a>
                            }
                        </div>
                        @if (v.address) {
                            <address>{{ v.address }}, {{ v.location }}</address>
                        }
                        <site-hours class="hours" />
                    </div>
                    <site-map class="map" />
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .pano {
                --s-ink: var(--s-on-accent);
                --s-muted: var(--s-on-accent);
                --s-line: color-mix(in srgb, var(--s-on-accent) 30%, transparent);
                --s-primary-text: var(--s-on-accent);
                --s-focus: var(--s-on-accent);
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
                padding: 0 18px;
                overflow: hidden;
                border-radius: var(--s-radius-btn);
                background: var(--s-on-accent);
                color: var(--s-accent);
                font-size: 16px;
                font-weight: 600;
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

            .hours {
                margin-top: 10px;
            }

            .map {
                min-height: 300px;
                --s-map-radius: var(--s-radius-img);
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
