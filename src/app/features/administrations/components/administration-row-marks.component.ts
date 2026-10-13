import { Component, input } from '@angular/core';
import type { AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { ADMINISTRATION_LATE_ENTRY_LABEL, administrationStockOutcomeLabel } from '@/app/features/administrations/utils/administration-labels';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Uygulama satırının işaretleri: "Kesinleştirmeden sonra eklendi" (+ gerekçe) ve iptal (+ stok sonucu, gerekçe). */
@Component({
    selector: 'app-administration-row-marks',
    standalone: true,
    imports: [AppStatusTagComponent],
    template: `
        @if (row().addedAfterFinalization) {
            <div data-testid="late-entry">
                <app-status-tag [label]="lateEntryLabel" severity="warn" />
                @if (row().lateEntryReason) {
                    <div class="text-xs text-muted-color">Gerekçe: {{ row().lateEntryReason }}</div>
                }
            </div>
        }
        @if (row().isVoided) {
            <div data-testid="voided">
                <app-status-tag label="İptal" severity="danger" />
                @if (row().voidStockOutcome; as outcome) {
                    <span class="text-xs text-muted-color" data-testid="void-outcome"> {{ outcomeLabel(outcome) }}</span>
                }
                @if (row().voidReason) {
                    <div class="text-xs text-muted-color">{{ row().voidReason }}</div>
                }
            </div>
        }
    `
})
export class AdministrationRowMarksComponent {
    readonly row = input.required<AdministrationVm>();

    protected readonly lateEntryLabel = ADMINISTRATION_LATE_ENTRY_LABEL;
    protected readonly outcomeLabel = administrationStockOutcomeLabel;
}
