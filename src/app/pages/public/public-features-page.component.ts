import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PUBLIC_FEATURE_SECTIONS } from '@/app/features/public/utils/public-features-content.utils';
import { PUBLIC_FEATURES_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { PublicCtaComponent } from './components/public-cta.component';
import { PublicPageHeaderComponent } from './components/public-page-header.component';
import { PublicScreenshotPlaceholderComponent } from './components/public-screenshot-placeholder.component';

/** Özellikler (tasarım belgesi 5.2): 6 bölüm, metin + ekran dönüşümlü; masaüstünde yapışkan bölüm dizini. */
@Component({
    selector: 'app-public-features-page',
    standalone: true,
    imports: [PublicPageHeaderComponent, PublicScreenshotPlaceholderComponent, PublicCtaComponent],
    template: `
        <app-public-page-header
            eyebrow="Özellikler"
            title="Gelişten tahsilata bir günün akışı"
            lead="Modül listesi değil, bir ziyaretin yolculuğu: hasta kapıdan girer, muayene olur, ücreti alınır, gün kapanır. Her adımda tek ekran."
        />

        <div class="mx-auto max-w-6xl px-4 md:px-6 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
            <nav class="hidden lg:block" aria-label="Bölüm dizini">
                <ul class="sticky top-24 m-0 list-none p-0 pt-16 text-sm">
                    @for (section of sections; track section.id) {
                        <li>
                            <a [href]="'#' + section.id" class="public-index-link flex min-h-9 items-center text-surface-600 no-underline dark:text-surface-300">{{
                                section.title
                            }}</a>
                        </li>
                    }
                </ul>
            </nav>

            <div>
                @for (section of sections; track section.id; let i = $index) {
                    <section [id]="section.id" class="public-section scroll-mt-24" [attr.aria-labelledby]="'feature-' + section.id">
                        <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
                            <div [class.lg:order-2]="i % 2 === 1">
                                <h2 [id]="'feature-' + section.id" class="public-h2 m-0">{{ section.title }}</h2>
                                <p class="public-lead m-0 mt-3">{{ section.lead }}</p>
                                <ul class="m-0 mt-5 list-none space-y-2.5 p-0">
                                    @for (bullet of section.bullets; track bullet) {
                                        <li class="flex items-start gap-2.5 text-base text-surface-700 dark:text-surface-200">
                                            <i class="pi pi-check mt-1 shrink-0 text-sm text-[var(--public-accent)]" aria-hidden="true"></i>
                                            <span>{{ bullet }}</span>
                                        </li>
                                    }
                                </ul>
                            </div>
                            <app-public-screenshot-placeholder [label]="section.screenshot" />
                        </div>
                    </section>
                }
            </div>
        </div>

        <app-public-cta />
    `
})
export class PublicFeaturesPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly sections = PUBLIC_FEATURE_SECTIONS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_FEATURES_PAGE_META, this.document);
    }
}
