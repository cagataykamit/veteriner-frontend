import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import {
    PUBLIC_MIGRATION_EXCLUDED,
    PUBLIC_MIGRATION_INCLUDED,
    PUBLIC_MIGRATION_STEPS
} from '@/app/features/public/utils/public-migration-content.utils';
import { PUBLIC_MIGRATION_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicScreenshotPlaceholderComponent } from './components/public-screenshot-placeholder.component';

/** Geçiş (tasarım belgesi 5.4): dikey zaman çizgisi, aktarılır/aktarılmaz kutuları, 3 soru, çağrı. */
@Component({
    selector: 'app-public-migration-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicScreenshotPlaceholderComponent, PublicFaqListComponent, PublicCtaComponent],
    template: `
        <app-public-page-header
            eyebrow="Geçiş"
            title="Eski programdan geçiş yarım gün"
            lead="Excel ya da CSV dosyanızı yükleyin, sütunları eşleyin, kontrol edin, aktarın. Yanlış giderse geri alın."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <div class="public-section grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
                <ol class="public-timeline m-0 list-none p-0" aria-label="Geçiş adımları">
                    @for (step of steps; track step.title; let i = $index) {
                        <li class="public-timeline-item">
                            <span class="public-timeline-marker" aria-hidden="true">{{ i + 1 }}</span>
                            <div class="pb-10">
                                <h2 class="m-0 text-xl font-semibold text-surface-900 dark:text-surface-0">{{ step.title }}</h2>
                                <p class="m-0 mt-1.5 text-base text-surface-600 dark:text-surface-300">{{ step.description }}</p>
                                @if (step.screenshot) {
                                    <div class="mt-4 max-w-md">
                                        <app-public-screenshot-placeholder [label]="step.screenshot" />
                                    </div>
                                }
                            </div>
                        </li>
                    }
                </ol>

                <aside class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
                    <div class="public-card p-5">
                        <h2 class="m-0 text-base font-semibold text-surface-900 dark:text-surface-0">Aktarılır</h2>
                        <ul class="m-0 mt-3 list-none space-y-2 p-0 text-sm">
                            @for (item of included; track item) {
                                <li class="flex items-center gap-2 text-surface-700 dark:text-surface-200">
                                    <i class="pi pi-check text-[var(--public-accent)]" aria-hidden="true"></i>{{ item }}
                                </li>
                            }
                        </ul>
                    </div>
                    <div class="public-card p-5">
                        <h2 class="m-0 text-base font-semibold text-surface-900 dark:text-surface-0">Şimdilik aktarılmaz</h2>
                        <ul class="m-0 mt-3 list-none space-y-2 p-0 text-sm">
                            @for (item of excluded; track item) {
                                <li class="flex items-center gap-2 text-surface-700 dark:text-surface-200">
                                    <i class="pi pi-minus text-surface-400" aria-hidden="true"></i>{{ item }}
                                </li>
                            }
                        </ul>
                    </div>
                </aside>
            </div>

            <section class="public-section mx-auto max-w-3xl" aria-labelledby="migration-faq-title">
                <h2 id="migration-faq-title" class="public-h2 m-0 mb-6">Geçişle ilgili sorular</h2>
                <app-public-faq-list [items]="faqs" idPrefix="migration-faq" />
            </section>
        </div>

        <app-public-cta title="Dosyanıza birlikte bakalım" lead="Eski programınızın dışa aktarımını gönderin; neyin aktarılacağını önceden söyleyelim." secondaryLabel="Bize yazın" />
    `
})
export class PublicMigrationPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly steps = PUBLIC_MIGRATION_STEPS;
    readonly included = PUBLIC_MIGRATION_INCLUDED;
    readonly excluded = PUBLIC_MIGRATION_EXCLUDED;
    readonly faqs = publicFaqsOf('gecis');

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_MIGRATION_PAGE_META, this.document);
    }
}
