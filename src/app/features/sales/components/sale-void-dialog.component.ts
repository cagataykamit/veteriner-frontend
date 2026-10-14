import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { SaleStockOutcomeApi } from '@/app/features/sales/models/sale-api.model';
import type { SaleDetailVm } from '@/app/features/sales/models/sale-vm.model';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

const STOCK_OUTCOME_OPTIONS: { label: string; value: SaleStockOutcomeApi }[] = [
    { label: 'Stoğa dön', value: 'StockReturned' },
    { label: 'Zarar yaz', value: 'WrittenOff' }
];

/**
 * Satış iptali (`Sales.Correct`, yalnız tam iptal): gerekçe + stok sonucu. Satışın ödemesi ve ücreti de iptal olur;
 * ücrete sonradan başka ödeme tahsis edilmişse sunucu `Charges.VoidBlockedByAllocation` (409) döner ve mesaj diyalogda kalır.
 * Yetki denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-sale-void-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SelectButtonModule, ReasonConfirmDialogComponent],
    template: `
        <app-reason-confirm-dialog
            [(visible)]="visible"
            header="Satışı iptal et"
            [summary]="summary()"
            description="Tüm satış iptal edilir: ödeme alınmamış sayılır ve ücret düşer. Kısmi iade yoktur; geri alınamaz."
            confirmLabel="Satışı iptal et"
            failureFallback="Satış iptal edilemedi."
            [execute]="execute"
            (confirmed)="onConfirmed()"
        >
            <div class="mb-4" data-testid="sale-void-stock-outcome">
                <span id="sale-void-outcome-label" class="block text-sm font-medium text-muted-color mb-2">Stok</span>
                <p-selectbutton
                    [options]="outcomeOptions"
                    [ngModel]="stockOutcome()"
                    (ngModelChange)="stockOutcome.set($event)"
                    optionLabel="label"
                    optionValue="value"
                    [allowEmpty]="false"
                    ariaLabelledBy="sale-void-outcome-label"
                />
                <small class="block mt-1 text-muted-color">
                    @if (stockOutcome() === 'StockReturned') {
                        Satılan ürünler aynı partiye geri eklenir.
                    } @else {
                        Ürünler stoğa dönmez (zarar / imha); stok artmaz.
                    }
                </small>
            </div>
        </app-reason-confirm-dialog>
    `
})
export class SaleVoidDialogComponent {
    readonly visible = model(false);
    readonly sale = input.required<{ id: string; clientName: string; totalText: string }>();
    readonly voided = output<SaleDetailVm>();

    private readonly sales = inject(SalesService);

    protected readonly outcomeOptions = STOCK_OUTCOME_OPTIONS;
    protected readonly stockOutcome = signal<SaleStockOutcomeApi>('StockReturned');

    private result: SaleDetailVm | null = null;

    protected summary(): string {
        const s = this.sale();
        return `${s.clientName} · ${s.totalText}`;
    }

    protected readonly execute = (reason: string) =>
        this.sales.voidSale(this.sale().id, { reason, stockOutcome: this.stockOutcome() }).pipe(tap((result) => (this.result = result)));

    protected onConfirmed(): void {
        if (this.result) {
            this.voided.emit(this.result);
        }
        this.stockOutcome.set('StockReturned');
    }
}
