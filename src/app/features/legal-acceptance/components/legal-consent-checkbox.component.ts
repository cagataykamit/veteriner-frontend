import { Component, computed, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { LEGAL_DOCUMENTS_BY_TYPE, type LegalDocumentType } from '@/app/entities/legal-document/utils/legal-documents.utils';

/**
 * Hukuki metinler için tek onay kutusu (ADR-029 madde 4): belgeler yeni sekmede açılır, böylece form kaybolmaz.
 * Kayıt, davet katılımı ve kabul penceresi aynı bileşeni kullanır.
 */
@Component({
    selector: 'app-legal-consent-checkbox',
    standalone: true,
    imports: [FormsModule, CheckboxModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="legal-consent flex items-start gap-2">
            <p-checkbox [inputId]="inputId()" [binary]="true" [(ngModel)]="checked" [disabled]="disabled()" />
            <!-- Ayraçlar bağlantıya bitişik kalsın diye satır tek parça. -->
            <label [for]="inputId()" class="text-sm leading-6 text-surface-700 dark:text-surface-200">
                @for (doc of links(); track doc.path; let last = $last; let first = $first) {
                    @if (!first) {
                        <span>{{ last ? ' ve ' : ', ' }}</span>
                    }
                    <a [href]="doc.path" target="_blank" rel="noopener" class="public-brand-link">{{ doc.shortTitle }}</a>
                }
                metinlerini okudum ve kabul ediyorum.</label
            >
        </div>
    `
})
export class LegalConsentCheckboxComponent {
    readonly documents = input.required<readonly LegalDocumentType[]>();
    readonly inputId = input('legalConsent');
    readonly disabled = input(false);
    readonly checked = model(false);

    readonly links = computed(() => this.documents().map((t) => LEGAL_DOCUMENTS_BY_TYPE[t]));
}
