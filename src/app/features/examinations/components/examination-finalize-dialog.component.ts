import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { ExaminationFinalizeResultVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Muayene kesinleştirme onayı (`Examinations.Finalize`). Kesinleşen muayene salt okunur olur, geri dönüş yoktur;
 * düzeltme yalnız ek notla yapılır. Yetki denetimi çağıran bileşende yapılır.
 * Gönderim sürerken tekrar tıklama ikinci istek atmaz (ikinci çağrı sunucuda `AlreadyFinalized` 409 olurdu).
 */
@Component({
    selector: 'app-examination-finalize-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule],
    template: `
        <p-dialog
            header="Muayeneyi kesinleştir"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(520px, 95vw)' }"
            [(visible)]="visible"
        >
            <p class="mt-0">
                Kesinleştirdikten sonra bu muayenenin içeriği <strong>değiştirilemez</strong>; işlem geri alınamaz.
                Sonradan düzeltme gerekirse yalnızca gerekçeli bir <strong>ek not</strong> eklenebilir.
            </p>
            <p class="mb-0 text-muted-color">Ekranda gördüğünüz içeriğin son kayıtlı içerik olduğundan emin olun.</p>
            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert" data-testid="finalize-error">{{ submitError() }}</p>
            }
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    label="Kesinleştir"
                    icon="pi pi-lock"
                    [loading]="submitting()"
                    [disabled]="submitting() || !rowVersion()"
                    data-testid="finalize-confirm"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class ExaminationFinalizeDialogComponent {
    readonly visible = model(false);
    readonly examinationId = input.required<string>();
    /** Ekranın açıldığı sürüm (`GET /examinations/{id}`); yoksa kesinleştirilemez. */
    readonly rowVersion = input<string | null>(null);
    readonly finalized = output<ExaminationFinalizeResultVm>();

    private readonly examinationsService = inject(ExaminationsService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.submitError.set(null));
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        const rowVersion = this.rowVersion();
        if (this.submitting() || !rowVersion) {
            return;
        }
        this.submitError.set(null);
        this.submitting.set(true);
        this.examinationsService.finalizeExamination(this.examinationId(), rowVersion).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.finalized.emit(result);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Muayene kesinleştirilemedi.'));
            }
        });
    }
}
