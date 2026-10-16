import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { map, of, switchMap } from 'rxjs';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

/** İptal edilecek lab kaydı; `rowVersion` yoksa (liste satırı) onayda güncel sürüm detaydan okunur. */
export interface LabResultCancelTarget {
    id: string;
    testName: string;
    petName: string;
    rowVersion?: string;
}

/**
 * Lab kaydının gerekçeli iptali (`LabResults.Update`); detay sayfası ve liste satırı aynı diyaloğu kullanır.
 * Yetki ve durum (iptal edilebilir mi) denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-lab-result-cancel-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReasonConfirmDialogComponent],
    template: `
        <app-reason-confirm-dialog
            [(visible)]="visible"
            header="Lab kaydını iptal et"
            [summary]="summary()"
            description="İptal edilen kayıt silinmez; listelerde varsayılan olarak gizlenir. Geri alınamaz."
            confirmLabel="Kaydı iptal et"
            failureFallback="Lab kaydı iptal edilemedi."
            [execute]="execute"
            (confirmed)="cancelled.emit()"
        />
    `
})
export class LabResultCancelDialogComponent {
    readonly visible = model(false);
    readonly target = input<LabResultCancelTarget | null>(null);
    readonly cancelled = output<void>();

    private readonly labResultsService = inject(LabResultsService);

    protected summary(): string | null {
        const t = this.target();

        return t ? `${t.testName} · ${t.petName}` : null;
    }

    protected readonly execute = (reason: string) => {
        const t = this.target()!;
        const rowVersion$ = t.rowVersion ? of(t.rowVersion) : this.labResultsService.getLabResultById(t.id).pipe(map((d) => d.rowVersion));

        return rowVersion$.pipe(switchMap((rowVersion) => this.labResultsService.cancelLabResult(t.id, reason, rowVersion)));
    };
}
