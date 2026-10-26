import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HbsDataDialogComponent } from '@/app/features/hbs/components/hbs-data-dialog.component';
import { HbsStatusBadgeComponent } from '@/app/features/hbs/components/hbs-status-badge.component';
import type { HbsEntryVm, HbsRecordKind } from '@/app/features/hbs/models/hbs.model';
import { HBS_REFERENCE_LABEL } from '@/app/features/hbs/utils/hbs-status.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Reçete/aşı detayındaki "HBS" kartı: durum rozeti, dönen numara ve "HBS verisi" diyaloğu. Takip dışı kayıtta (ör. planlı aşı) çizilmez.
 */
@Component({
    selector: 'app-hbs-section',
    standalone: true,
    imports: [ButtonModule, HbsStatusBadgeComponent, HbsDataDialogComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (entry(); as e) {
            @if (e.isTracked) {
                <div class="card" data-testid="hbs-section">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h5 class="m-0">HBS</h5>
                        <p-button type="button" label="HBS verisi" icon="pi pi-clipboard" severity="secondary" data-testid="hbs-open-dialog" (onClick)="dialogOpen.set(true)" />
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <app-hbs-status-badge [status]="e.status" />
                        @if (e.referenceNumber) {
                            <span class="text-sm"
                                >{{ referenceLabel() }}: <span class="font-medium">{{ e.referenceNumber }}</span></span
                            >
                        }
                        @if (e.notRequiredReason) {
                            <span class="text-sm text-muted-color">Gerekçe: {{ e.notRequiredReason }}</span>
                        }
                    </div>
                    @if (marked(); as m) {
                        <p class="mt-2 mb-0 text-sm text-muted-color">{{ m }}</p>
                    }
                </div>
                <app-hbs-data-dialog [(visible)]="dialogOpen" [kind]="kind()" [recordId]="recordId()" [canEdit]="canEdit()" (saved)="entryChange.emit($event)" />
            }
        }
    `
})
export class HbsSectionComponent {
    readonly kind = input.required<HbsRecordKind>();
    readonly recordId = input.required<string>();
    readonly entry = input<HbsEntryVm | null>(null);
    readonly canEdit = input(false);
    readonly entryChange = output<HbsEntryVm>();

    readonly dialogOpen = signal(false);

    protected readonly referenceLabel = computed(() => HBS_REFERENCE_LABEL[this.kind()]);

    protected readonly marked = computed(() => {
        const e = this.entry();

        if (!e || e.status === 'NotEntered') {
            return null;
        }

        return [e.markedByName, e.markedAtUtc ? formatUtcIsoAsLocalDateTimeDisplay(e.markedAtUtc) : ''].filter(Boolean).join(' · ') || null;
    });
}
