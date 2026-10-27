import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import type { HbsEntryStatus } from '@/app/entities/hbs/models/hbs.model';
import { HBS_STATUS_LABEL, HBS_STATUS_SEVERITY } from '@/app/entities/hbs/utils/hbs-status.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Satırda/detayda HBS durum rozeti; durum yoksa (takip dışı kayıt) hiçbir şey çizmez. */
@Component({
    selector: 'app-hbs-status-badge',
    standalone: true,
    imports: [AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (status(); as s) {
            <app-status-tag data-testid="hbs-status-badge" [label]="label()" [severity]="severity()" />
        }
    `
})
export class HbsStatusBadgeComponent {
    readonly status = input<HbsEntryStatus | null | undefined>(null);

    protected readonly label = computed(() => {
        const s = this.status();

        return s ? HBS_STATUS_LABEL[s] : '';
    });

    protected readonly severity = computed(() => {
        const s = this.status();

        return s ? HBS_STATUS_SEVERITY[s] : 'secondary';
    });
}
