import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { map, of, switchMap } from 'rxjs';
import { ImagingRecordsService } from '@/app/entities/imaging/services/imaging-records.service';
import { imagingModalityLabel } from '@/app/entities/imaging/utils/imaging.utils';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

/** İptal edilecek kayıt; `rowVersion` yoksa (liste satırı) onayda güncel sürüm detaydan okunur. */
export interface ImagingCancelTarget {
    id: string;
    modality: string;
    petName: string;
    rowVersion?: string;
}

/**
 * Görüntüleme kaydının gerekçeli iptali (`Imaging.Cancel`); detay ve liste satırı aynı diyaloğu kullanır (ADR-026 kural 7).
 * Kayıt silinmez; dosyaların erişimi kapanır. Yetki denetimi çağırandadır.
 */
@Component({
    selector: 'app-imaging-cancel-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReasonConfirmDialogComponent],
    template: `
        <app-reason-confirm-dialog
            [(visible)]="visible"
            header="Görüntüleme kaydını iptal et"
            [summary]="summary()"
            description="İptal edilen kayıt silinmez; dosyaları artık açılamaz ve listelerde varsayılan olarak gizlenir. Geri alınamaz."
            confirmLabel="Kaydı iptal et"
            failureFallback="Görüntüleme kaydı iptal edilemedi."
            [execute]="execute"
            (confirmed)="cancelled.emit()"
        />
    `
})
export class ImagingCancelDialogComponent {
    readonly visible = model(false);
    readonly target = input<ImagingCancelTarget | null>(null);
    readonly cancelled = output<void>();

    private readonly imagingService = inject(ImagingRecordsService);

    protected summary(): string | null {
        const t = this.target();

        return t ? `${imagingModalityLabel(t.modality)} · ${t.petName}` : null;
    }

    protected readonly execute = (reason: string) => {
        const t = this.target()!;
        const rowVersion$ = t.rowVersion ? of(t.rowVersion) : this.imagingService.getById(t.id).pipe(map((d) => d.rowVersion));

        return rowVersion$.pipe(switchMap((rowVersion) => this.imagingService.cancel(t.id, reason, rowVersion)));
    };
}
