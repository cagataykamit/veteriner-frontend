import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

/**
 * Telefonda alttaki sabit eylem şeridi (W-01 A): giriş bölümünün düğmeleri ekrandan çıkınca görünür, alt sayfada hep görünür. Online
 * randevu açıksa "Ara" + "Randevu al", kapalıysa yalnız "Ara · numara". Geniş ekranda üst çubuk aynı işi gördüğü için çizilmez.
 * Konumu `sticky`dır: site kabının içinde kalır, önizleme çerçevesinde de çerçevenin altına yapışır.
 */
@Component({
    selector: 'site-dock',
    standalone: true,
    imports: [SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        @if (v.bookingHref || v.telHref) {
            <div class="dock" [class.is-on]="shown()" [attr.aria-hidden]="shown() ? null : 'true'" [attr.inert]="shown() ? null : ''">
                @if (v.telHref) {
                    <a class="btn call" [class.main]="!v.bookingHref" [class.line]="!!v.bookingHref" [href]="v.telHref"
                        ><site-icon name="phone" />Ara
                        @if (!v.bookingHref) {
                            · {{ v.phone }}
                        }
                    </a>
                }
                @if (v.bookingHref) {
                    <a class="btn main book" [href]="v.bookingHref"><site-icon name="calendar" />{{ v.copy.ctaPrimary }}</a>
                }
            </div>
        }
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            :host {
                position: sticky;
                bottom: 0;
                z-index: 30;
                height: 0;
            }

            .dock {
                position: absolute;
                right: 0;
                bottom: 0;
                left: 0;
                display: flex;
                gap: 10px;
                padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
                border-top: 1px solid var(--s-line);
                background: var(--s-bg);
                box-shadow: 0 -6px 20px rgb(0 0 0 / 8%);
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;
            }

            .dock.is-on {
                opacity: 1;
                visibility: visible;
            }

            .btn {
                flex: 1 1 0;
                padding: 0 14px;
                white-space: normal;
            }

            .call.line {
                flex: 0 0 auto;
            }

            @container site (min-width: 900px) {
                :host {
                    display: none;
                }
            }
        `
    ]
})
export class SiteDockComponent extends SiteSection {
    protected readonly shown = computed(() => !this.site.onHome() || !this.site.heroActionsVisible());
}
