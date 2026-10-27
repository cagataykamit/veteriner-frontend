import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import type { AdministrationStockOutcome, AdministrationVm } from '@/app/entities/administration/models/administration-vm.model';
import { AdministrationsService } from '@/app/entities/administration/services/administrations.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

/**
 * Uygulamayı gerekçeyle iptal eder (`Administrations.Correct`, ADR-013): stok sonucu "Stoğa iade et" (varsayılan) veya "Zarar / imha olarak yaz".
 * Yetki denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-administration-void-dialog',
    standalone: true,
    imports: [FormsModule, RadioButtonModule, ReasonConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-reason-confirm-dialog
            [(visible)]="visible"
            header="Uygulamayı iptal et"
            [summary]="summary()"
            [description]="description()"
            confirmLabel="Uygulamayı iptal et"
            failureFallback="Uygulama iptal edilemedi."
            [execute]="execute"
            (confirmed)="onConfirmed()"
        >
            <fieldset class="border-0 p-0 m-0 mb-4" data-testid="stock-outcome">
                <legend class="text-sm font-medium text-muted-color mb-2 p-0">Ürün ne oldu?</legend>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <p-radiobutton name="stockOutcome" value="StockReturned" [ngModel]="outcome()" (ngModelChange)="outcome.set($event)" />
                        <span>Stoğa iade et</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <p-radiobutton name="stockOutcome" value="WrittenOff" [ngModel]="outcome()" (ngModelChange)="outcome.set($event)" />
                        <span>Zarar / imha olarak yaz</span>
                    </label>
                </div>
            </fieldset>
        </app-reason-confirm-dialog>
    `
})
export class AdministrationVoidDialogComponent {
    readonly visible = model(false);
    readonly target = input.required<AdministrationVm | null>();
    /** İptal başarılı olunca seçilen stok sonucuyla. */
    readonly voided = output<AdministrationStockOutcome>();

    private readonly administrationsService = inject(AdministrationsService);

    readonly outcome = signal<AdministrationStockOutcome>('StockReturned');

    readonly summary = computed(() => {
        const a = this.target();

        return a ? `${a.productName} · ${a.quantity} ${a.unit}` : null;
    });
    readonly description = computed(() => {
        const base =
            this.outcome() === 'WrittenOff'
                ? 'Uygulama silinmez, iptal edildi olarak işaretlenir. Ürün stoğa geri verilmez; zarar/imha olarak kayıtta kalır. Gerekçede nedenini yazın.'
                : 'Uygulama silinmez, iptal edildi olarak işaretlenir ve ürün stoğa geri verilir. Yanlış miktar/ürün için iptal edip yeniden kaydedin.';

        return this.target()?.vaccinationId ? `${base} Bu uygulama bir aşı kaydına bağlı; iptalde aşı kaydı da iptal edilir.` : base;
    });

    readonly execute = (reason: string) => this.administrationsService.voidAdministration(this.target()!.id, reason, this.outcome());

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.outcome.set('StockReturned'));
            }
        });
    }

    onConfirmed(): void {
        this.voided.emit(this.outcome());
    }
}
