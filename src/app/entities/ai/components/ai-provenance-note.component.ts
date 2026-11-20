import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AiProvenanceChipComponent } from '@/app/entities/ai/components/ai-provenance-chip.component';
import type { AiProvenanceVm } from '@/app/entities/ai/models/ai-vm.model';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Kaydın başındaki tek satırlık AI izi: "Serbest nottan AI taslağıyla dolduruldu; Dr. Ayşe Kaya 19.11.2026 14:36 tarihinde kabul etti."
 * Bir kayda birden çok kabul olabilir (eskiden yeniye). İz yoksa hiçbir şey çizmez.
 */
@Component({
    selector: 'app-ai-provenance-note',
    standalone: true,
    imports: [AiProvenanceChipComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (p of provenance(); track p.draftId) {
            <p class="m-0 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm text-muted-color" data-testid="ai-provenance-note">
                <i class="pi pi-sparkles text-ai text-[0.8rem]" aria-hidden="true"></i>
                <span>{{ sentence(p) }}</span>
                <app-ai-provenance-chip [edited]="p.edited" [acceptedByName]="p.acceptedByName" [acceptedAtUtc]="p.acceptedAtUtc" />
            </p>
        }
    `
})
export class AiProvenanceNoteComponent {
    readonly provenance = input<readonly AiProvenanceVm[]>([]);
    /** Ne yapıldığı: "Serbest nottan AI taslağıyla dolduruldu". */
    readonly text = input.required<string>();

    protected sentence(p: AiProvenanceVm): string {
        const who = p.acceptedByName ? `${p.acceptedByName} ` : '';
        const when = p.acceptedAtUtc ? `${formatDateTimeDisplay(p.acceptedAtUtc)} tarihinde ` : '';

        return who || when ? `${this.text()}; ${who}${when}kabul etti.` : `${this.text()}.`;
    }
}
