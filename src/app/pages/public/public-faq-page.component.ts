import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PUBLIC_FAQ_CATEGORIES } from '@/app/features/public/utils/public-faq-content.utils';
import { PUBLIC_FAQ_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicFaqListComponent } from './components/public-faq-list.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';

/** SSS (tasarım belgesi 5.6): masaüstünde sol dikey kategori sekmeleri, mobilde alt alta sarılan çipler (hepsi görünür). */
@Component({
    selector: 'app-public-faq-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicFaqListComponent, PublicCtaComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-page-header eyebrow="SSS" title="Sık sorulan sorular" lead="Fiyat, deneme, güvenlik, geçiş ve destek hakkında kısa yanıtlar." />

        <div class="mx-auto max-w-6xl px-4 md:px-6">
            <div class="public-section grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-14">
                <div role="tablist" aria-label="SSS kategorileri" class="flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:flex-nowrap lg:self-start">
                    @for (category of categories; track category.id) {
                        <button
                            type="button"
                            role="tab"
                            [id]="'faq-tab-' + category.id"
                            [attr.aria-selected]="activeId() === category.id"
                            [attr.aria-controls]="'faq-panel-' + category.id"
                            class="public-chip-tab shrink-0"
                            [class.public-chip-tab--active]="activeId() === category.id"
                            (click)="activeId.set(category.id)"
                        >
                            {{ category.label }}
                        </button>
                    }
                </div>

                <section
                    role="tabpanel"
                    [id]="'faq-panel-' + active().id"
                    [attr.aria-labelledby]="'faq-tab-' + active().id"
                    class="max-w-3xl"
                >
                    <h2 class="public-h2 m-0 mb-6">{{ active().label }}</h2>
                    <app-public-faq-list [items]="active().items" [idPrefix]="'faq-' + active().id" />
                </section>
            </div>
        </div>

        <app-public-cta title="Yanıtını bulamadınız mı?" lead="Bize yazın; bir iş günü içinde dönmeyi hedefliyoruz." secondaryLabel="Bize yazın" />
    `
})
export class PublicFaqPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly categories = PUBLIC_FAQ_CATEGORIES;
    readonly activeId = signal(PUBLIC_FAQ_CATEGORIES[0].id);
    readonly active = computed(() => this.categories.find((c) => c.id === this.activeId()) ?? this.categories[0]);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_FAQ_PAGE_META, this.document);
    }
}
