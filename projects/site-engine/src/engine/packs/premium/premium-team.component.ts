import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Premium: dikey uzun paneller yatay kayar; fotoğraf yoksa panelin kendisi büyük tırnaklı monogram olur. */
@Component({
    selector: 'site-premium-team',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.teamTitle }}</h2>
                    <p class="muted intro">{{ v.copy.teamIntro }}</p>
                </header>
            </div>
            <ul class="rail" tabindex="0" aria-label="Hekimler, yatay kaydırılır">
                @for (member of people(); track member.slug) {
                    <li>
                        <div class="panel">
                            @if (member.image) {
                                <img [siteImg]="member.image" [alt]="''" />
                            } @else {
                                <span class="mono h" aria-hidden="true">{{ member.initials }}</span>
                            }
                        </div>
                        <h3 class="h name">{{ member.name }}</h3>
                        <p class="role">{{ member.title }}</p>
                        <p class="muted spec">{{ member.specialties.join(' · ') }}</p>
                    </li>
                }
            </ul>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .head {
                margin-bottom: 32px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5.4cqi, 84px));
            }

            .intro {
                max-width: 44ch;
                margin-top: 12px;
                font-size: 16px;
                line-height: 1.55;
            }

            .rail {
                display: flex;
                gap: 16px;
                padding-inline: max(var(--s-gutter), calc((100cqi - var(--s-max)) / 2 + var(--s-gutter)));
                overflow-x: auto;
                scroll-snap-type: x proximity;
                scroll-padding-inline: var(--s-gutter);
                scrollbar-width: thin;
            }

            li {
                flex: none;
                width: min(76cqi, 340px);
                padding-bottom: 12px;
                scroll-snap-align: start;
            }

            .panel {
                display: grid;
                place-items: center;
                aspect-ratio: 3 / 4;
                margin-bottom: 16px;
                overflow: hidden;
                border-radius: var(--s-radius-img);
                background: var(--s-band);
                color: var(--s-on-band);
            }

            .panel img {
                filter: saturate(0.85);
                transition: transform 0.6s ease;
            }

            li:hover .panel img {
                transform: scale(1.03);
            }

            .mono {
                font-size: calc(var(--s-head-scale) * 96px);
            }

            .name {
                font-size: calc(var(--s-head-scale) * 26px);
            }

            .role {
                margin-top: 6px;
                font-size: 15px;
            }

            .spec {
                margin-top: 4px;
                font-size: 14px;
                line-height: 1.45;
            }

            @container site (min-width: 860px) {
                li {
                    width: clamp(280px, 27cqi, 420px);
                }
            }
        `
    ]
})
export class PremiumTeamComponent extends SiteSection {
    protected readonly people = computed(() => (this.site.page() === '/ekibimiz' ? this.vm().members : this.vm().doctors));
}
