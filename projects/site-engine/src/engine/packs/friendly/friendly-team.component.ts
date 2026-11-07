import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Friendly: panoya tutturulmuş fotoğraf kâğıtları; dönüşümlü eğik, üstüne gelince düzelir. Fotoğraf yoksa renkli monogram. */
@Component({
    selector: 'site-friendly-team',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec tint">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.teamTitle }}</h2>
                    <p class="intro">{{ v.copy.teamIntro }}</p>
                </header>
                <ul class="board">
                    @for (member of people(); track member.slug) {
                        <li>
                            <div class="pic">
                                @if (member.image) {
                                    <img [siteImg]="member.image" [alt]="''" />
                                } @else {
                                    <span class="h" aria-hidden="true">{{ member.initials }}</span>
                                }
                            </div>
                            <h3 class="h name">{{ member.name }}</h3>
                            <p class="role">{{ member.title }}</p>
                            @if (member.specialties.length) {
                                <ul class="tags">
                                    @for (item of member.specialties; track item) {
                                        <li>{{ item }}</li>
                                    }
                                </ul>
                            }
                        </li>
                    }
                </ul>
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        `
            .tint {
                background: var(--s-tint);
                color: var(--s-on-tint);
            }

            .head {
                margin-bottom: 32px;
            }

            .title {
                font-size: calc(var(--s-head-scale) * clamp(36px, 5cqi, 72px));
            }

            .intro {
                margin-top: 10px;
                font-size: 18px;
            }

            .board {
                display: grid;
                gap: 24px;
            }

            .board > li {
                width: min(86%, 380px);
                padding: 12px 12px 18px;
                border-radius: var(--s-radius);
                background: var(--s-bg);
                color: var(--s-ink);
                box-shadow: 0 12px 28px color-mix(in srgb, var(--s-ink) 14%, transparent);
                transition: transform 0.25s ease;
            }

            .board > li:nth-child(odd) {
                transform: rotate(-1.6deg);
            }

            .board > li:nth-child(even) {
                justify-self: end;
                transform: rotate(1.4deg);
            }

            .board > li:hover {
                transform: none;
            }

            .pic {
                display: grid;
                place-items: center;
                aspect-ratio: 1;
                margin-bottom: 14px;
                overflow: hidden;
                border-radius: calc(var(--s-radius) - 4px);
                background: var(--s-secondary);
                color: var(--s-on-secondary);
                font-size: 72px;
            }

            .name {
                font-size: calc(var(--s-head-scale) * 24px);
            }

            .role {
                margin-top: 4px;
                font-size: 15px;
            }

            .tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 10px;
            }

            .tags li {
                padding: 4px 10px;
                border-radius: 999px;
                background: var(--s-tint);
                color: var(--s-on-tint);
                font-size: 13px;
            }

            @container site (min-width: 860px) {
                .board {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 28px;
                }

                .board > li {
                    width: clamp(260px, 26cqi, 360px);
                }

                .board > li:nth-child(even) {
                    margin-top: 28px;
                }
            }
        `
    ]
})
export class FriendlyTeamComponent extends SiteSection {
    protected readonly people = computed(() => (this.site.page() === '/ekibimiz' ? this.vm().members : this.vm().doctors));
}
