import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Modern: künye tablosu gibi satırlar. Fotoğraf yoksa monogram; hekim sayısı arttıkça düzen bozulmaz. */
@Component({
    selector: 'site-modern-team',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec tint">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.teamTitle }}</h2>
                    <p class="muted intro">{{ v.copy.teamIntro }}</p>
                </header>
                <ul class="rows">
                    @for (member of people(); track member.slug) {
                        <li class="row">
                            <span class="pic" aria-hidden="true">
                                @if (member.image) {
                                    <img [siteImg]="member.image" [alt]="''" />
                                } @else {
                                    {{ member.initials }}
                                }
                            </span>
                            <h3 class="h name">{{ member.name }}</h3>
                            <p class="role">{{ member.title }}</p>
                            <p class="spec muted">{{ member.specialties.join(', ') }}</p>
                        </li>
                    }
                </ul>
                @if (v.pages.hekimler && site.onHome()) {
                    <a class="tlink more" siteLink="/hekimler">Hekimlerimizi tanıyın</a>
                }
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
                max-width: 48ch;
                margin-top: 14px;
                font-size: 17px;
                line-height: 1.5;
            }

            .rows {
                margin-top: 32px;
                border-top: 1px solid var(--s-line);
            }

            .row {
                display: grid;
                grid-template-columns: 72px minmax(0, 1fr);
                column-gap: 16px;
                row-gap: 2px;
                align-items: start;
                padding: 16px 0;
                border-bottom: 1px solid var(--s-line);
            }

            .pic {
                display: grid;
                grid-row: span 3;
                place-items: center;
                width: 72px;
                height: 72px;
                overflow: hidden;
                border-radius: var(--s-radius);
                background: var(--s-primary);
                color: var(--s-on-primary);
                font-family: var(--s-head);
                font-size: 24px;
                font-weight: var(--s-head-weight);
            }

            .name {
                font-size: calc(var(--s-head-scale) * 22px);
            }

            .role,
            .spec {
                font-size: 15px;
                line-height: 1.4;
            }

            .more {
                margin-top: 20px;
            }

            @container site (min-width: 860px) {
                .row {
                    grid-template-columns: 112px minmax(0, 4fr) minmax(0, 3fr) minmax(0, 3fr);
                    column-gap: clamp(20px, 3cqi, 48px);
                    align-items: center;
                }

                .pic {
                    grid-row: auto;
                    width: 112px;
                    height: 84px;
                    font-size: 30px;
                }

                .name {
                    font-size: calc(var(--s-head-scale) * clamp(24px, 2.2cqi, 32px));
                }
            }
        `
    ]
})
export class ModernTeamComponent extends SiteSection {
    protected readonly people = computed(() => (this.site.page() === '/ekibimiz' ? this.vm().members : this.vm().doctors));
}
