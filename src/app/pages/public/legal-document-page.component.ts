import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicTopbarComponent } from '@/app/pages/public/components/public-topbar.component';
import { PublicFooterComponent } from '@/app/pages/public/components/public-footer.component';
import { LegalDraftNoticeComponent } from '@/app/pages/public/components/legal-draft-notice.component';
import {
    LEGAL_DOCUMENTS,
    LEGAL_DRAFT_NOTICE,
    legalParagraphParts,
    type LegalDocumentKey,
    type LegalSectionDef
} from '@/app/features/public/utils/legal-documents.utils';
import { setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

/** Gizlilik politikası / kullanım şartları; belge rota `data.legalDocument` ile seçilir. */
@Component({
    selector: 'app-legal-document-page',
    standalone: true,
    imports: [RouterLink, PublicTopbarComponent, PublicFooterComponent, LegalDraftNoticeComponent],
    template: `
        <div class="public-page min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
            <app-public-topbar />

            <main class="mx-auto max-w-3xl px-4 pb-10 pt-2 md:px-6 md:pb-14 md:pt-3">
                <article class="rounded-3xl border border-surface-200 bg-surface-0 p-5 md:p-8 dark:border-surface-700 dark:bg-surface-900">
                    <app-legal-draft-notice />

                    <header class="mb-6 border-b border-surface-200 pb-4 dark:border-surface-700">
                        <h1 class="m-0 text-2xl font-bold leading-tight text-surface-900 dark:text-surface-0 md:text-3xl">{{ doc.title }}</h1>
                        <p class="m-0 mt-1 text-sm text-muted-color">({{ doc.subtitle }})</p>
                        <p class="legal-version-line m-0 mt-3 text-xs text-muted-color">{{ doc.versionLine }}</p>
                    </header>

                    @for (section of sections; track $index) {
                        <section class="mt-6 first-of-type:mt-0">
                            @if (section.heading) {
                                <h2 class="m-0 mb-2 text-base font-semibold text-surface-900 dark:text-surface-0 md:text-lg">{{ section.heading }}</h2>
                            }
                            @for (paragraph of section.paragraphs; track $index) {
                                <p class="m-0 mb-2 text-sm leading-6 text-surface-700 dark:text-surface-200">
                                    @for (part of paragraph; track $index) {
                                        @if (part.routerLink) {
                                            <a [routerLink]="part.routerLink" class="public-brand-link">{{ part.text }}</a>
                                        } @else if (part.strong) {
                                            <strong>{{ part.text }}</strong>
                                        } @else {
                                            {{ part.text }}
                                        }
                                    }
                                </p>
                            }
                            @if (section.items.length) {
                                <ul class="m-0 list-disc space-y-1.5 pl-5 text-sm leading-6 text-surface-700 dark:text-surface-200">
                                    @for (item of section.items; track $index) {
                                        <li>{{ item }}</li>
                                    }
                                </ul>
                            }
                        </section>
                    }
                </article>
            </main>

            <app-public-footer />
        </div>
    `
})
export class LegalDocumentPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly doc = LEGAL_DOCUMENTS[inject(ActivatedRoute).snapshot.data['legalDocument'] as LegalDocumentKey];

    /** Giriş paragrafları başlıksız ilk bölüm olarak gösterilir. */
    readonly sections = (
        [...(this.doc.intro ? [{ heading: '', paragraphs: this.doc.intro }] : []), ...this.doc.sections] as readonly LegalSectionDef[]
    ).map((section) => ({
        heading: section.heading,
        paragraphs: (section.paragraphs ?? []).map(legalParagraphParts),
        items: section.items ?? []
    }));

    ngOnInit(): void {
        setPublicPageMeta(
            this.title,
            this.meta,
            {
                title: `${this.doc.shortTitle} — Vetinity`,
                description: this.doc.description,
                canonicalPath: this.doc.path,
                noindex: LEGAL_DRAFT_NOTICE !== null
            },
            this.document
        );
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
    }
}
