import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PORTAL_LEGAL_DOCUMENTS } from './portal-legal-documents';
import type { PortalLegalDocumentVersion } from './portal-legal.api';
import { PortalLegalText } from './portal-legal-text.component';

let nextId = 0;

/**
 * Portal belgelerinin engelleyici kabulü (ADR-029 madde 4: tek onay kutusu, belgelere bağlı). Belgeler sayfadan
 * ayrılmadan açılıp okunabilir; sürüm, kabul edilecek sürümün kendisidir (backend listesi).
 */
@Component({
    selector: 'portal-legal-consent',
    standalone: true,
    imports: [ReactiveFormsModule, PortalLegalText],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="portal-stack" [attr.aria-labelledby]="headingId">
            <h2 [id]="headingId" class="portal-subtitle">Kullanım şartları ve gizlilik</h2>
            @for (doc of documents(); track doc.documentType) {
                <details class="portal-details">
                    <summary>{{ definition(doc).shortTitle }} (sürüm {{ doc.version }})</summary>
                    <div class="portal-scroll-box" tabindex="0" [attr.aria-label]="definition(doc).title">
                        <portal-legal-text [document]="definition(doc)" [version]="doc.version" />
                    </div>
                </details>
            }
            <label class="portal-check">
                <input
                    type="checkbox"
                    [formControl]="control()"
                    [attr.aria-invalid]="showError()"
                    [attr.aria-describedby]="showError() ? errorId : null"
                />
                <span>{{ consentText() }}</span>
            </label>
            @if (showError()) {
                <p [id]="errorId" class="portal-field-error">Devam etmek için belgeleri okuyup onaylamanız gerekiyor.</p>
            }
        </section>
    `
})
export class PortalLegalConsent {
    readonly documents = input.required<readonly PortalLegalDocumentVersion[]>();
    readonly control = input.required<FormControl<boolean>>();
    readonly showError = input(false);

    readonly headingId = `portal-legal-consent-${++nextId}`;
    readonly errorId = `${this.headingId}-error`;

    definition(doc: PortalLegalDocumentVersion) {
        return PORTAL_LEGAL_DOCUMENTS[doc.documentType];
    }

    consentText(): string {
        const titles = this.documents().map((d) => PORTAL_LEGAL_DOCUMENTS[d.documentType].shortTitle);

        return `${titles.join(' ve ')} metinlerini okudum, kabul ediyorum.`;
    }
}
