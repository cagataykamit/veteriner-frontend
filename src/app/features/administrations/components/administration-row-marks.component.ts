import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { ADMINISTRATION_LATE_ENTRY_LABEL, administrationBatchText, administrationStockOutcomeLabel } from '@/app/features/administrations/utils/administration-labels';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Uygulama satırının işaretleri: düşülen parti (seri no, SKT), "Kesinleştirmeden sonra eklendi" (+ gerekçe) ve iptal (+ stok sonucu, gerekçe). */
@Component({
    selector: 'app-administration-row-marks',
    standalone: true,
    imports: [AppStatusTagComponent, RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (batchText(); as text) {
            <div class="text-xs text-muted-color" data-testid="batch-info">{{ text }}</div>
        }
        @if (row().vaccinationId) {
            <div class="text-xs" data-testid="vaccination-link">
                <span class="text-muted-color">Aşı kaydına bağlı · </span>
                <a [routerLink]="['/panel/vaccinations', row().vaccinationId]" class="text-primary no-underline">Aşıyı aç →</a>
            </div>
        }
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
    protected readonly batchText = computed(() => administrationBatchText(this.row()));
}
