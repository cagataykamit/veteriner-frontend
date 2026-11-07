import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteMapComponent } from '../../site-parts.component';

/** Modern: dev telefon numarası başlık gibi; altında çizgili bilgi tablosu, yanında sade konum çizimi. */
@Component({
    selector: 'site-modern-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteMapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec tint">
            <div class="inner">
                <header class="s-head">
                    <h2 class="kick">{{ v.copy.contactTitle }}</h2>
                </header>
                @if (v.telHref) {
                    <a class="h phone" [href]="v.telHref">{{ v.phone }}</a>
                }
                <div class="grid">
                    <div>
                        <p class="muted intro">{{ v.copy.contactText }}</p>
                        <dl class="info">
                            @if (v.address) {
                                <div>
                                    <dt>Adres</dt>
                                    <dd>
                                        <address>{{ v.address }}<br />{{ v.location }}</address>
                                    </dd>
                                </div>
                            }
                            @if (v.mailHref) {
                                <div>
                                    <dt>E-posta</dt>
                                    <dd><a [href]="v.mailHref">{{ v.email }}</a></dd>
                                </div>
                            }
                            @if (v.whatsappHref) {
                                <div>
                                    <dt>WhatsApp</dt>
                                    <dd><a [href]="v.whatsappHref" target="_blank" rel="noopener">Mesaj gönder</a></dd>
                                </div>
                            }
                        </dl>
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
            .tint {
                background: var(--s-surface);
            }

            .kick {
                margin-bottom: 16px;
                color: var(--s-muted);
                font-size: 14px;
                font-weight: 500;
            }

            .phone {
                display: flex;
                align-items: center;
                min-height: 48px;
                font-size: calc(var(--s-head-scale) * clamp(40px, 9cqi, 148px));
                font-variant-numeric: tabular-nums;
                text-decoration: none;
                white-space: nowrap;
            }

            .grid {
                display: grid;
                gap: 28px;
                margin-top: 28px;
            }

            .intro {
                max-width: 44ch;
                margin-bottom: 20px;
                font-size: 17px;
                line-height: 1.5;
            }

            .info {
                border-top: 1px solid var(--s-line);
            }

            .info > div {
                display: grid;
                grid-template-columns: 96px minmax(0, 1fr);
                gap: 12px;
                padding: 12px 0;
                border-bottom: 1px solid var(--s-line);
                font-size: 15px;
                line-height: 1.45;
            }

            dt {
                color: var(--s-muted);
            }

            dd a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                margin-block: -10px;
                overflow-wrap: anywhere;
                text-underline-offset: 3px;
            }

            .hours {
                margin-top: 16px;
            }

            .map {
                min-height: 320px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
                    gap: clamp(28px, 4cqi, 64px);
                    margin-top: 48px;
                }
            }
        `
    ]
})
export class ModernContactComponent extends SiteSection {}
