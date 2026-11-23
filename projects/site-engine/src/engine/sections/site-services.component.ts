import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { serviceIcon } from '../site-icons';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

const HOME_COUNT = 6;

/**
 * Hizmetler: ikonlu kartlar; ikon hizmet adından seçilir (`serviceIcon`). Hizmetin kendi sayfası açıksa kart oraya gider. Ana sayfada
 * ilk altı hizmet, fazlası varsa "Bütün hizmetler" düğmesi.
 */
@Component({
    selector: 'site-services',
    standalone: true,
    imports: [NgTemplateOutlet, SECTION_DIRECTIVES, SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.servicesTitle }}</h2>
                    <p class="intro">{{ v.copy.servicesIntro }}</p>
                </header>
                <ul class="grid">
                    @for (service of site.cap(v.services, count); track service.slug) {
                        <li>
                            @if (v.pages.hizmetDetay) {
                                <a class="card item" [siteLink]="service.path"><ng-container *ngTemplateOutlet="body; context: { $implicit: service }" /></a>
                            } @else {
                                <div class="card item"><ng-container *ngTemplateOutlet="body; context: { $implicit: service }" /></div>
                            }
                        </li>
                    }
                </ul>
                @if (v.pages.hizmetler && site.onHome() && v.services.length > count) {
                    <a class="btn line more" siteLink="/hizmetler">Bütün hizmetler<site-icon name="arrowRight" /></a>
                }
            </div>
        </section>

        <ng-template #body let-service>
            <span class="bub"><site-icon [name]="icon(service.title)" /></span>
            <span class="txt">
                <h3 class="t">{{ service.title }}</h3>
                @if (service.summary) {
                    <p class="d">{{ service.summary }}</p>
                }
            </span>
        </ng-template>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .grid {
                display: grid;
                gap: 12px;
            }

            .item {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                height: 100%;
                padding: 18px;
                text-decoration: none;
                transition: border-color 0.15s ease;
            }

            a.item:hover {
                border-color: var(--s-line-strong);
            }

            .txt {
                min-width: 0;
            }

            .t {
                font: 600 17px/1.3 var(--s-body);
                overflow-wrap: break-word;
            }

            .d {
                margin-top: 4px;
                color: var(--s-muted);
                font-size: 15.5px;
                line-height: 1.5;
            }

            @container site (min-width: 640px) {
                .grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @container site (min-width: 900px) {
                .grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 16px;
                }

                .item {
                    flex-direction: column;
                    gap: 16px;
                    padding: 24px;
                }
            }
        `
    ]
})
export class SiteServicesComponent extends SiteSection {
    protected readonly count = HOME_COUNT;
    protected readonly icon = serviceIcon;
}
