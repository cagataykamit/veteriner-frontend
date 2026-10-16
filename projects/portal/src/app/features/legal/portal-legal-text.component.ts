import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PORTAL_LEGAL_DRAFT_NOTICE, PortalLegalDocument, PortalLegalInline, PortalLegalParagraph, portalLegalVersionLine } from './portal-legal-documents';

function parts(paragraph: PortalLegalParagraph): readonly PortalLegalInline[] {
    const list = typeof paragraph === 'string' ? [paragraph] : paragraph;

    return list.map((p) => (typeof p === 'string' ? { text: p } : p));
}

/** Portal hukuki belgesinin gövdesi: sürüm satırı, taslak bandı, bölümler. Sayfa ve kabul adımı aynı bileşeni kullanır. */
@Component({
    selector: 'portal-legal-text',
    standalone: true,
    imports: [NgTemplateOutlet, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p class="portal-muted" data-testid="legal-version">{{ versionLine() }}</p>
        @if (draftNotice) {
            <p class="portal-draft-band" role="note">{{ draftNotice }}</p>
        }
        <div class="portal-legal-text">
            @for (paragraph of document().intro; track $index) {
                <p><ng-container *ngTemplateOutlet="inline; context: { $implicit: paragraph }" /></p>
            }
            @for (section of document().sections; track $index) {
                @if (section.heading) {
                    <h3>{{ section.heading }}</h3>
                }
                @for (paragraph of section.paragraphs ?? []; track $index) {
                    <p><ng-container *ngTemplateOutlet="inline; context: { $implicit: paragraph }" /></p>
                }
                @if (section.items?.length) {
                    <ul>
                        @for (item of section.items; track $index) {
                            <li><ng-container *ngTemplateOutlet="inline; context: { $implicit: item }" /></li>
                        }
                    </ul>
                }
                @for (paragraph of section.closing ?? []; track $index) {
                    <p><ng-container *ngTemplateOutlet="inline; context: { $implicit: paragraph }" /></p>
                }
            }
        </div>

        <ng-template #inline let-paragraph>
            @for (part of toParts(paragraph); track $index) {
                @if (part.routerLink) {
                    <a [routerLink]="part.routerLink">{{ part.text }}</a>
                } @else if (part.strong) {
                    <strong>{{ part.text }}</strong>
                } @else {
                    {{ part.text }}
                }
            }
        </ng-template>
    `
})
export class PortalLegalText {
    readonly document = input.required<PortalLegalDocument>();
    /** Backend sürümü (`GET /legal-documents` veya bekleyen kabul listesi); yoksa yalnız durum satırı. */
    readonly version = input<string | null>(null);

    readonly draftNotice = PORTAL_LEGAL_DRAFT_NOTICE;
    readonly versionLine = computed(() => portalLegalVersionLine(this.document(), this.version()));

    readonly toParts = parts;
}
