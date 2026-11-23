import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteMapComponent, SiteStatusComponent } from '../../site-parts.component';

/**
 * Modern: büyük başlık, altında çizgili bilgi tablosu (telefon normal ölçüde ve tıklanır, K-01) ve "Haritada aç" kartı; yanında bugünü
 * işaretli saat tablosu. Kartsız, çizgiyle bölünür.
 */
@Component({
    selector: 'site-modern-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteMapComponent, SiteStatusComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec tint">
            <div class="inner">
                <header class="s-head">
                    <h2 class="h title">{{ v.copy.contactTitle }}</h2>
                </header>
                <p class="muted intro s-head">{{ v.copy.contactText }}</p>
                <div class="grid" [class.no-hours]="!v.hasHours">
                    <div>
                        <dl class="info">
                            @if (v.telHref) {
                                <div>
                                    <dt>Telefon</dt>
                                    <dd><a class="tel" [href]="v.telHref">{{ v.phone }}</a></dd>
                                </div>
                            }
                            @if (v.whatsappHref) {
                                <div>
                                    <dt>WhatsApp</dt>
                                    <dd><a [href]="v.whatsappHref" target="_blank" rel="noopener">Mesaj gönder</a></dd>
                                </div>
                            }
                            @if (v.mailHref) {
                                <div>
                                    <dt>E-posta</dt>
                                    <dd><a [href]="v.mailHref">{{ v.email }}</a></dd>
                                </div>
                            }
                            @if (v.address || v.location) {
                                <div>
                                    <dt>Adres</dt>
                                    <dd>
                                        <address>
                                            {{ v.address }}
                                            @if (v.address && v.location) {
                                                <br />
                                            }
                                            {{ v.location }}
                                        </address>
                                    </dd>
                                </div>
                            }
                        </dl>
                        <site-map class="map" />
                    </div>
                    @if (v.hasHours) {
                        <div>
                            <h3 class="kick">Çalışma saatleri</h3>
                            <p class="now"><site-status [strong]="true" /></p>
                            <site-hours />
                        </div>
                    }
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

            .title {
                font-size: calc(var(--s-head-scale) * clamp(34px, 4.6cqi, 68px));
            }

            .intro {
                max-width: 44ch;
                margin-top: 14px;
                font-size: 17px;
                line-height: 1.5;
            }

            .grid {
                display: grid;
                gap: 36px;
                margin-top: 28px;
            }

            .info {
                border-top: 1px solid var(--s-line);
            }

            .info > div {
                display: grid;
                grid-template-columns: 96px minmax(0, 1fr);
                gap: 12px;
                align-items: baseline;
                padding: 12px 0;
                border-bottom: 1px solid var(--s-line);
                font-size: 16px;
                line-height: 1.45;
            }

            dt {
                color: var(--s-muted);
                font-size: 15px;
            }

            dd a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                margin-block: -10px;
                overflow-wrap: anywhere;
                text-underline-offset: 3px;
            }

            .tel {
                font-size: 19px;
                font-weight: 600;
                font-variant-numeric: tabular-nums;
            }

            .map {
                margin-top: 20px;
            }

            .kick {
                padding-bottom: 12px;
                border-bottom: 1px solid var(--s-line);
                color: var(--s-muted);
                font-size: 15px;
                font-weight: 500;
            }

            .now {
                padding: 12px 0 4px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
                    gap: clamp(28px, 5cqi, 80px);
                    margin-top: 48px;
                }

                .grid.no-hours {
                    grid-template-columns: minmax(0, 640px);
                }
            }
        `
    ]
})
export class ModernContactComponent extends SiteSection {}
