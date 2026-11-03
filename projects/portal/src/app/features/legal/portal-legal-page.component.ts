import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { PORTAL_LEGAL_DOCUMENTS } from './portal-legal-documents';
import { PortalLegalApi, PortalLegalDocumentType } from './portal-legal.api';
import { PortalLegalText } from './portal-legal-text.component';

/** Herkese açık portal belgesi sayfası; sürüm `GET /legal-documents`'tan (tek kaynak, ADR-029). */
@Component({
    selector: 'portal-legal-page',
    standalone: true,
    imports: [PortalBrandHeader, PortalFooter, PortalLegalText],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="portal-page portal-stack">
            <portal-brand-header />
            <article class="portal-card portal-stack" [attr.aria-labelledby]="'legal-title'">
                <h1 id="legal-title" class="portal-title">{{ document().title }}</h1>
                <portal-legal-text [document]="document()" [version]="version()" />
            </article>
            <portal-footer />
        </main>
    `
})
export class PortalLegalPageComponent implements OnInit {
    private readonly legalApi = inject(PortalLegalApi);

    /** Rota `data.documentType` (component input binding). */
    readonly documentType = input.required<PortalLegalDocumentType>();

    readonly document = computed(() => PORTAL_LEGAL_DOCUMENTS[this.documentType()]);
    readonly version = signal<string | null>(null);

    ngOnInit(): void {
        this.legalApi.documents().subscribe({
            next: (docs) => this.version.set(docs.find((d) => d.documentType === this.documentType())?.version ?? null),
            // Sürüm alınamazsa metin yine gösterilir; yalnız sürüm satırı eksik kalır.
            error: () => this.version.set(null)
        });
    }
}
