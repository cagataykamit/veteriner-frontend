import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: oval çerçeveler, inişli çıkışlı dizilim; ad ve uzmanlık ortalı. Fotoğraf yoksa yumuşak zeminde monogram. */
@Component({
    selector: 'site-nature-team',
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
                <ul class="row">
                    @for (member of people(); track member.slug) {
                        <li>
                            <div class="oval">
                                @if (member.image) {
                                    <img [siteImg]="member.image" [alt]="''" />
                                } @else {
                                    <span class="h" aria-hidden="true">{{ member.initials }}</span>
                                }
                            </div>
                            <h3 class="h name">{{ member.name }}</h3>
                            <p class="role">{{ member.title }}</p>
                            <p class="muted spec">{{ member.specialties.join(', ') }}</p>
                        </li>
                    }
                </ul>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .head {
                max-width: 680px;
                margin: 0 auto 36px;
                text-align: center;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(38px, 5cqi, 76px));
            }

            .intro {
                margin-top: 12px;
                font-size: 18px;
            }

            .row {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 28px 18px;
            }

            li {
                text-align: center;
            }

            li:nth-child(even) {
                margin-top: 32px;
            }

            li:last-child:nth-child(odd) {
                grid-column: span 2;
                justify-self: center;
                width: 50%;
            }

            .oval {
                display: grid;
                place-items: center;
                aspect-ratio: 4 / 5;
                margin-bottom: 14px;
                overflow: hidden;
                border-radius: 50%;
                background: var(--s-tint);
                color: var(--s-on-tint);
                font-size: calc(var(--s-head-scale) * 56px);
            }

            .name {
                font-size: calc(var(--s-head-scale) * clamp(20px, 2.1cqi, 28px));
            }

            .role {
                margin-top: 6px;
                font-size: 14px;
                line-height: 1.4;
            }

            .spec {
                margin-top: 2px;
                font-size: 14px;
                line-height: 1.4;
            }

            @container site (min-width: 860px) {
                .row {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 28px clamp(24px, 4cqi, 64px);
                }

                li,
                li:last-child:nth-child(odd) {
                    width: clamp(220px, 22cqi, 320px);
                }

                li:nth-child(even) {
                    margin-top: 64px;
                }
            }
        `
    ]
})
export class NatureTeamComponent extends SiteSection {
    protected readonly people = computed(() => (this.site.page() === '/ekibimiz' ? this.vm().members : this.vm().doctors));
}
