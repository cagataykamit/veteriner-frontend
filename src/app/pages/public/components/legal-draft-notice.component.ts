import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LEGAL_DRAFT_NOTICE } from '@/app/entities/legal-document/utils/legal-documents.utils';

/** Hukuki metin taslak bandı; `LEGAL_DRAFT_NOTICE` null olunca hiçbir şey göstermez. */
@Component({
    selector: 'app-legal-draft-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (notice) {
            <div
                class="legal-draft-notice mb-6 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                role="note"
            >
                <i class="pi pi-exclamation-triangle mt-0.5 shrink-0" aria-hidden="true"></i>
                <span>{{ notice }}</span>
            </div>
        }
    `
})
export class LegalDraftNoticeComponent {
    readonly notice = LEGAL_DRAFT_NOTICE;
}
