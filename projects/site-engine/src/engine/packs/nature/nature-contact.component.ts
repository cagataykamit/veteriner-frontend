import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';
import { SiteHoursComponent, SiteMapComponent } from '../../site-parts.component';

/** Nature: kemerli pencerede konum çizimi; yanında sakin bir yazı ve saatler. */
@Component({
    selector: 'site-nature-contact',
    standalone: true,
    imports: [SiteHoursComponent, SiteMapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner grid">
                <site-map class="map" />
                <div>
                    <h2 class="h title s-head">{{ v.copy.contactTitle }}</h2>
                    <p class="intro">{{ v.copy.contactText }}</p>
                    @if (v.address) {
                        <address class="addr">{{ v.address }}<br />{{ v.location }}</address>
                    }
                    <p class="acts">
                        @if (v.telHref) {
                            <a class="btn main" [href]="v.telHref">{{ v.phone }}</a>
                        }
                        @if (v.mailHref) {
                            <a class="tlink" [href]="v.mailHref">{{ v.email }}</a>
                        }
                    </p>
                    <site-hours class="hours" />
                </div>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .grid {
                display: grid;
                gap: 32px;
            }

            .map {
                min-height: 380px;
                --s-map-radius: 999px 999px var(--s-radius-img) var(--s-radius-img);
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
                gap: 8px 20px;
                margin-top: 18px;
            }

            .hours {
                margin-top: 20px;
            }

            @container site (min-width: 860px) {
                .grid {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    align-items: center;
                    gap: clamp(40px, 8cqi, 128px);
                }

                .map {
                    min-height: 560px;
                }
            }
        `
    ]
})
export class NatureContactComponent extends SiteSection {}
