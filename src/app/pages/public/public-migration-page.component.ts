import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import {
    PUBLIC_MIGRATION_INCLUDED,
    PUBLIC_MIGRATION_STEPS,
    PUBLIC_MIGRATION_SUPPORT_POINTS,
    PUBLIC_MIGRATION_SUPPORT_PRICE
} from '@/app/features/public/utils/public-migration-content.utils';
import { PUBLIC_MIGRATION_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/** Geçiş (tasarım belgesi 5.4, TIER-021): güneş tonunda dikey adım yolu, aktarılanlar ve geçiş desteği kutuları, sorular, çağrı. */
@Component({
    selector: 'app-public-migration-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicFaqListComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header
            eyebrow="Geçiş"
            title="Eski programdan kayıtlarınızla geçin"
            lead="Excel ya da CSV dosyanızı yükleyin, sütunları eşleyin, kontrol edin, aktarın. Yanlış giderse geri alın."
        />

        <div class="ps-wrap">
            <div class="ps-section ps-section--tight ps-aside-layout">
                <!-- Adımlar: güneş tonunda dikey yol -->
                <ol class="ps-list ps-steps ps-steps--path ps-tone-sun" aria-label="Geçiş adımları" data-migration-steps>
                    @for (step of steps; track step.title; let i = $index) {
                        <li>
                            <span class="ps-bubble ps-bubble--big" aria-hidden="true">{{ i + 1 }}</span>
                            <div>
                                <h2 class="ps-h3 ps-h3--first">{{ step.title }}</h2>
                                <p>{{ step.description }}</p>
                            </div>
                        </li>
                    }
                </ol>

                <aside class="ps-aside">
                    <div class="ps-card ps-card--plain ps-tone-mint">
                        <h2 class="ps-h3"><span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-check"></i></span>Aktarılır</h2>
                        <ul class="ps-list ps-ticklist ps-ticklist--two">
                            @for (item of included; track item) {
                                <li><i class="pi pi-check" aria-hidden="true"></i><span>{{ item }}</span></li>
                            }
                        </ul>
                    </div>
                    <div class="ps-card ps-tone-lilac" data-testid="migration-support">
                        <h2 class="ps-h3"><span class="ps-round ps-round--small" aria-hidden="true"><i class="pi pi-headphones"></i></span>Geçiş desteği</h2>
                        <ul class="ps-list ps-ticklist">
                            @for (item of supportPoints; track item) {
                                <li><i class="pi pi-check" aria-hidden="true"></i><span>{{ item }}</span></li>
                            }
                        </ul>
                        <p class="ps-strong">{{ supportPrice }}</p>
                    </div>
                </aside>
            </div>
        </div>

        <section class="ps-section ps-section--band" aria-labelledby="migration-faq-title">
            <div class="ps-wrap ps-narrow">
                <header class="ps-head ps-head--center">
                    <h2 id="migration-faq-title" class="public-h2">Geçişle ilgili sorular</h2>
                </header>
                <app-public-faq-list [items]="faqs" idPrefix="migration-faq" />
            </div>
        </section>

        <app-public-cta title="Dosyanıza birlikte bakalım" lead="Sorunuzu yazın ya da demo isteyin; eski programınızın dışa aktarımına görüşmede ekran paylaşımıyla birlikte bakalım." secondaryLabel="Bize yazın" />
    `
})
export class PublicMigrationPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly steps = PUBLIC_MIGRATION_STEPS;
    readonly included = PUBLIC_MIGRATION_INCLUDED;
    readonly supportPoints = PUBLIC_MIGRATION_SUPPORT_POINTS;
    readonly supportPrice = PUBLIC_MIGRATION_SUPPORT_PRICE;
    readonly faqs = publicFaqsOf('gecis');

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_MIGRATION_PAGE_META, this.document);
    }
}
