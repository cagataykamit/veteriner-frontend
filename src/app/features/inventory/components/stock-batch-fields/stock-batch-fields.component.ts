import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { STOCK_BATCH_INVOICE_MAX, STOCK_BATCH_LOT_MAX, STOCK_BATCH_SUPPLIER_MAX, STOCK_BATCH_TRANSPORT_MAX, isStockBatchExpiryPast, type StockBatchFormGroup } from '@/app/features/inventory/forms/stock-batch-form.factory';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';

/**
 * Stok girişi parti bilgileri (seri/lot, SKT, firma, fatura, geliş/depo çıkış tarihi, nakil, soğuk zincir).
 * Zorunluluk doğrulayıcısını `applyStockBatchRequirement` ekler; burada `required` yalnız işaret ve açıklama içindir.
 */
@Component({
    selector: 'app-stock-batch-fields',
    standalone: true,
    imports: [ReactiveFormsModule, InputTextModule, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <fieldset [formGroup]="group()" class="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
            <legend class="p-0 mb-2 text-sm font-semibold">Parti bilgileri</legend>
            @if (required()) {
                <p class="text-sm m-0" role="note" data-testid="batch-required-note">Aşı ve kontrollü ürünlerde seri/lot no ile son kullanma tarihi (SKT) zorunludur.</p>
            } @else {
                <p class="text-sm text-muted-color m-0">Parti bilgisi girilmezse miktar partisiz bakiyeye eklenir.</p>
            }
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Lot'" class="block text-sm font-medium text-muted-color">Seri / lot no{{ required() ? ' *' : '' }}</label>
                    <input [id]="idPrefix() + 'Lot'" pInputText class="w-full" type="text" formControlName="lotNumber" autocomplete="off" [attr.maxlength]="lotMax" [attr.aria-required]="required()" />
                    @if (group().controls.lotNumber.touched && group().controls.lotNumber.hasError('required')) {
                        <small class="text-red-500">Seri/lot no zorunludur.</small>
                    }
                </div>
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Expiry'" class="block text-sm font-medium text-muted-color">Son kullanma tarihi (SKT){{ required() ? ' *' : '' }}</label>
                    <app-date-input [inputId]="idPrefix() + 'Expiry'" type="date" formControlName="expiryDate" limit="planned" />
                    @if (group().controls.expiryDate.touched && group().controls.expiryDate.hasError('required')) {
                        <small class="text-red-500">Son kullanma tarihi zorunludur.</small>
                    }
                </div>
                @if (expired()) {
                    <div class="col-span-12 rounded-border border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-950/30 p-3 flex flex-col gap-2" role="alert" data-testid="batch-expired-warning">
                        <p class="m-0 text-sm font-medium text-red-700 dark:text-red-300">Bu partinin son kullanma tarihi geçmiş.</p>
                        <p class="m-0 text-sm">Süresi geçmiş ürün hastaya uygulanamaz; stokta ayrı "süresi geçmiş" olarak görünür. Yine de kaydetmek için onaylayın.</p>
                        <label class="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="checkbox" formControlName="acknowledgeExpired" [id]="idPrefix() + 'AckExpired'" data-testid="batch-ack-expired" class="mt-0.5" />
                            <span>Son kullanma tarihinin geçmiş olduğunu biliyorum, yine de stoğa ekle.</span>
                        </label>
                        @if (group().controls.acknowledgeExpired.touched && group().hasError('expiredNotAcknowledged')) {
                            <small class="text-red-600 dark:text-red-400">Kaydetmek için onay kutusunu işaretleyin.</small>
                        }
                    </div>
                }
                <div class="col-span-12 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Supplier'" class="block text-sm font-medium text-muted-color">Satın alınan firma</label>
                    <input [id]="idPrefix() + 'Supplier'" pInputText class="w-full" type="text" formControlName="supplierName" autocomplete="off" [attr.maxlength]="supplierMax" />
                </div>
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Invoice'" class="block text-sm font-medium text-muted-color">Fatura no</label>
                    <input [id]="idPrefix() + 'Invoice'" pInputText class="w-full" type="text" formControlName="invoiceNumber" autocomplete="off" [attr.maxlength]="invoiceMax" />
                </div>
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'InvoiceDate'" class="block text-sm font-medium text-muted-color">Fatura tarihi</label>
                    <app-date-input [inputId]="idPrefix() + 'InvoiceDate'" type="date" formControlName="invoiceDate" limit="past" />
                </div>
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Received'" class="block text-sm font-medium text-muted-color">Geliş / teslim tarihi</label>
                    <app-date-input [inputId]="idPrefix() + 'Received'" type="date" formControlName="receivedDate" limit="past" />
                </div>
                <div class="col-span-12 sm:col-span-6 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Dispatched'" class="block text-sm font-medium text-muted-color">Depo çıkış tarihi</label>
                    <app-date-input [inputId]="idPrefix() + 'Dispatched'" type="date" formControlName="dispatchedDate" limit="past" />
                </div>
                @if (group().hasError('dispatchedAfterReceived')) {
                    <small class="col-span-12 text-red-500" role="alert">Depo çıkış tarihi geliş / teslim tarihinden sonra olamaz.</small>
                }
                <div class="col-span-12 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'Transport'" class="block text-sm font-medium text-muted-color">Nakil şekli</label>
                    <input [id]="idPrefix() + 'Transport'" pInputText class="w-full" type="text" formControlName="transportMethod" autocomplete="off" [attr.maxlength]="transportMax" />
                </div>
                <div class="col-span-12 flex flex-col gap-1">
                    <label [for]="idPrefix() + 'ColdChain'" class="block text-sm font-medium text-muted-color">Soğuk zincir izleme cihazı / indikatörü</label>
                    <input [id]="idPrefix() + 'ColdChain'" pInputText class="w-full" type="text" formControlName="coldChainMonitor" autocomplete="off" [attr.maxlength]="transportMax" />
                </div>
            </div>
        </fieldset>
    `
})
export class StockBatchFieldsComponent {
    readonly group = input.required<StockBatchFormGroup>();
    readonly required = input(false);
    /** Aynı sayfada benzersiz id'ler için. */
    readonly idPrefix = input('batch');

    protected expired(): boolean {
        return isStockBatchExpiryPast(this.group().controls.expiryDate.value);
    }

    protected readonly lotMax = STOCK_BATCH_LOT_MAX;
    protected readonly supplierMax = STOCK_BATCH_SUPPLIER_MAX;
    protected readonly invoiceMax = STOCK_BATCH_INVOICE_MAX;
    protected readonly transportMax = STOCK_BATCH_TRANSPORT_MAX;
}
