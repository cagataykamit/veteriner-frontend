import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { publicFaqsOf } from '@/app/features/public/utils/public-faq-content.utils';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import { PUBLIC_PILOT_PACKAGE } from '@/app/features/public/utils/public-packages-content.utils';
import { PUBLIC_PACKAGES_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/** Paketler (ADR-034 karar 4 (c)): tek kart "Pilot dönemi" + "Teklif al"; kullanıcı/klinik sınırı yazılmaz (WEB-007). */
@Component({
    selector: 'app-public-packages-page',
    standalone: true,
    imports: [RouterLink, PublicPageHeaderComponent, PublicFaqListComponent, PublicCtaComponent],
    template: `
        <app-public-page-header eyebrow="Paketler" title="Pilot dönemi: tüm özellikler, tek paket" [lead]="pkg.lead" />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <section class="public-section" aria-labelledby="pilot-package-title">
                <article class="public-card mx-auto max-w-3xl p-6 md:p-10">
                    <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h2 id="pilot-package-title" class="public-h2 m-0">{{ pkg.title }}</h2>
                            <p class="m-0 mt-2 text-xl font-semibold text-[var(--vetinity-navy)] dark:text-[var(--vetinity-soft-teal)]">{{ pkg.priceLabel }}</p>
                            <p class="m-0 mt-1 text-sm text-muted-color">{{ pkg.trialLabel }}</p>
                        </div>
                        <div class="flex flex-col gap-3 md:w-56">
                            <a [routerLink]="paths.contact" class="public-btn public-btn-primary w-full">Teklif al / yazın</a>
                            <a routerLink="/auth/signup" class="public-btn public-btn-secondary w-full">Ücretsiz dene</a>
                        </div>
                    </div>

                    <div class="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                        <div>
                            <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">Dahil</h3>
                            <ul class="m-0 mt-3 list-none space-y-2.5 p-0">
                                @for (item of pkg.includes; track item) {
                                    <li class="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-200">
                                        <i class="pi pi-check mt-0.5 shrink-0 text-[var(--public-accent)]" aria-hidden="true"></i>
                                        <span>{{ item }}</span>
                                    </li>
                                }
                            </ul>
                        </div>
                        <div>
                            <h3 class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">Bugün yok</h3>
                            <ul class="m-0 mt-3 list-none space-y-2.5 p-0">
                                @for (item of pkg.notIncluded; track item) {
                                    <li class="flex items-start gap-2.5 text-sm text-surface-600 dark:text-surface-300">
                                        <i class="pi pi-minus mt-0.5 shrink-0 text-surface-400" aria-hidden="true"></i>
                                        <span>{{ item }}</span>
                                    </li>
                                }
                            </ul>
                            <p class="public-note m-0 mt-4">Tarih vermiyoruz; çıkınca burada yazar.</p>
                        </div>
                    </div>
                </article>
            </section>

            <section class="public-section mx-auto max-w-3xl" aria-labelledby="packages-faq-title">
                <h2 id="packages-faq-title" class="public-h2 m-0 mb-6">Fiyat ve deneme hakkında</h2>
                <app-public-faq-list [items]="faqs" idPrefix="packages-faq" />
            </section>
        </div>

        <app-public-cta secondaryLabel="Teklif al" />
    `
})
export class PublicPackagesPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly paths = PUBLIC_PATHS;
    readonly pkg = PUBLIC_PILOT_PACKAGE;
    readonly faqs = publicFaqsOf('fiyat');

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_PACKAGES_PAGE_META, this.document);
    }
}
