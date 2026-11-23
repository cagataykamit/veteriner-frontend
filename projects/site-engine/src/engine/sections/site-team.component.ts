import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../site-context';
import { SECTION_BASE, SECTION_KIT } from '../section-base';
import { SiteIconComponent } from '../site-parts.component';

const HOME_COUNT = 6;

/** Hekimler (ekip sayfasında bütün ekip): fotoğraf ya da baş harfli yuvarlak, ad, unvan ve uzmanlık. Fotoğraf az da olsa düzen bozulmaz. */
@Component({
    selector: 'site-team',
    standalone: true,
    imports: [SECTION_DIRECTIVES, SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <section class="sec">
            <div class="inner">
                <header class="s-head head">
                    <h2 class="h title">{{ v.copy.teamTitle }}</h2>
                    <p class="intro">{{ v.copy.teamIntro }}</p>
                </header>
                <ul class="grid">
                    @for (member of site.cap(people(), count); track member.slug) {
                        <li class="card person">
                            <span class="pic" aria-hidden="true">
                                @if (member.image) {
                                    <img [siteImg]="member.image" [alt]="''" />
                                } @else {
                                    {{ member.initials }}
                                }
                            </span>
                            <span class="who">
                                <h3 class="name">{{ member.name }}</h3>
                                @if (member.title) {
                                    <p class="role">{{ member.title }}</p>
                                }
                                @if (member.specialties.length) {
                                    <p class="spec">{{ member.specialties.join(' · ') }}</p>
                                }
                            </span>
                        </li>
                    }
                </ul>
                @if (v.pages.hekimler && site.onHome()) {
                    <a class="btn line more" siteLink="/hekimler">Hekimlerimizi tanıyın<site-icon name="arrowRight" /></a>
                }
            </div>
        </section>
    `,
    styles: [
        SECTION_BASE,
        SECTION_KIT,
        `
            .grid {
                display: grid;
                gap: 12px;
            }

            .person {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 16px;
            }

            .pic {
                display: grid;
                place-items: center;
                flex: none;
                width: 56px;
                height: 56px;
                overflow: hidden;
                border-radius: 50%;
                background: var(--s-tint);
                color: var(--s-tint-primary);
                font-weight: 600;
                letter-spacing: 0.04em;
            }

            .who {
                min-width: 0;
            }

            .name {
                font: 600 17px/1.3 var(--s-body);
                overflow-wrap: break-word;
            }

            .role {
                margin-top: 2px;
                color: var(--s-secondary-text);
                font-size: 15px;
                font-weight: 500;
            }

            .spec {
                margin-top: 2px;
                color: var(--s-muted);
                font-size: 14.5px;
                line-height: 1.4;
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

                .person {
                    padding: 20px;
                }
            }
        `
    ]
})
export class SiteTeamComponent extends SiteSection {
    protected readonly count = HOME_COUNT;
    protected readonly people = computed(() => (this.site.page() === '/ekibimiz' ? this.vm().members : this.vm().doctors));
}
