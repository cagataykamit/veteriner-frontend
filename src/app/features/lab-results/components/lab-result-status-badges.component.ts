import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import type { LabResultStatus } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LAB_RESULT_AWAITING_INTERPRETATION_LABEL, labResultStatusLabel, labResultStatusSeverity } from '@/app/entities/lab-result/utils/lab-result-status.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Lab durum rozeti; "değerlendirme bekliyor" yalnız sonuçlanmış kayıtta `awaitingInterpretation` bayrağından gelir. */
@Component({
    selector: 'app-lab-result-status-badges',
    standalone: true,
    imports: [AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (status(); as s) {
            <span class="inline-flex flex-wrap gap-1 items-center">
                <app-status-tag [label]="statusLabel(s)" [severity]="statusSeverity(s)" />
                @if (showAwaiting()) {
                    <app-status-tag [label]="awaitingLabel" severity="warn" />
                }
            </span>
        }
    `
})
export class LabResultStatusBadgesComponent {
    readonly status = input<LabResultStatus | null>(null);
    readonly awaitingInterpretation = input(false);

    protected readonly awaitingLabel = LAB_RESULT_AWAITING_INTERPRETATION_LABEL;
    protected readonly statusLabel = labResultStatusLabel;
    protected readonly statusSeverity = labResultStatusSeverity;
    protected readonly showAwaiting = computed(() => this.status() === 'Resulted' && this.awaitingInterpretation());
}
