import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { DATA_PROCESSING_AGREEMENT_DOCUMENT, PUBLIC_LEGAL_LINKS } from '@/app/features/public/utils/legal-documents.utils';
import { PUBLIC_ABOUT_PARAGRAPHS, PUBLIC_LEGAL_ENTITY_NAME, PUBLIC_SUPPORT_HOURS } from '@/app/features/public/utils/public-contact-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_ABOUT_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/** Hakkımızda ve destek (tasarım belgesi 5.8): kısa metin, destek kanalı, hukuki metinler; fotoğraf/stok görsel yok. */
@Component({
    selector: 'app-public-about-page',
    standalone: true,
    imports: [RouterLink, PublicPageHeaderComponent],
    template: `
        <app-public-page-header eyebrow="Hakkımızda" title="Küçük veteriner klinikleri için, klinikle birlikte" />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <div class="public-section grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
                <section aria-labelledby="about-title">
                    <h2 id="about-title" class="public-h2 m-0">Kim, neden</h2>
                    @for (paragraph of paragraphs; track paragraph) {
                        <p class="m-0 mt-4 text-base leading-relaxed text-surface-700 dark:text-surface-200">{{ paragraph }}</p>
                    }
                    @if (legalEntityName) {
                        <p class="m-0 mt-6 text-sm text-muted-color">Tüzel kişi: {{ legalEntityName }}</p>
                    }
                </section>

                <aside class="flex flex-col gap-4">
                    <section class="public-card p-5" aria-labelledby="support-title">
                        <h2 id="support-title" class="m-0 text-base font-semibold text-surface-900 dark:text-surface-0">Destek</h2>
                        <p class="m-0 mt-2 text-sm text-surface-600 dark:text-surface-300">
                            Sorularınız için iletişim sayfasından bize ulaşın.
                            @if (supportHours) {
                                Çalışma saatleri: {{ supportHours }}.
                            }
                        </p>
                        <a [routerLink]="paths.contact" class="public-btn public-btn-secondary mt-4 w-full">İletişim</a>
                    </section>
                    <section class="public-card p-5" aria-labelledby="legal-title">
                        <h2 id="legal-title" class="m-0 text-base font-semibold text-surface-900 dark:text-surface-0">Hukuki metinler</h2>
                        <ul class="m-0 mt-3 list-none space-y-2 p-0 text-sm">
                            @for (doc of legalLinks; track doc.path) {
                                <li><a [routerLink]="doc.path" class="public-brand-link">{{ doc.shortTitle }}</a></li>
                            }
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    `
})
export class PublicAboutPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly paths = PUBLIC_PATHS;
    readonly paragraphs = PUBLIC_ABOUT_PARAGRAPHS;
    readonly legalLinks = [...PUBLIC_LEGAL_LINKS, DATA_PROCESSING_AGREEMENT_DOCUMENT];
    readonly legalEntityName = PUBLIC_LEGAL_ENTITY_NAME;
    readonly supportHours = PUBLIC_SUPPORT_HOURS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_ABOUT_PAGE_META, this.document);
    }
}
