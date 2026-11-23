import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { QuickProductDialogComponent, type QuickProductCreated } from '@/app/entities/inventory/components/quick-product-dialog.component';
import { type InlineCreateConfig, InlineCreateDirective } from '@/app/shared/forms/inline-create/inline-create.directive';
import { InlineCreateOptionComponent } from '@/app/shared/forms/inline-create/inline-create-option.component';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { mapGoodsReceiptFormToRequest } from '@/app/features/inventory/data/goods-receipt.mapper';
import { createGoodsReceiptFormGroup, createGoodsReceiptLineGroup, type GoodsReceiptLineGroup } from '@/app/features/inventory/forms/goods-receipt-form.factory';
import { isStockBatchExpiryPast, STOCK_BATCH_INVOICE_MAX, STOCK_BATCH_LOT_MAX, STOCK_BATCH_SUPPLIER_MAX, STOCK_BATCH_TRANSPORT_MAX } from '@/app/features/inventory/forms/stock-batch-form.factory';
import { GOODS_RECEIPT_MAX_LINES } from '@/app/features/inventory/models/goods-receipt-api.model';
import { GoodsReceiptSubmitError, type GoodsReceiptProductPick, type GoodsReceiptResultVm } from '@/app/features/inventory/models/goods-receipt-form.model';
import { GoodsReceiptService } from '@/app/features/inventory/services/goods-receipt.service';
import { BarcodeScanButtonComponent } from '@/app/entities/inventory/components/barcode-scan-button.component';
import type { ProductListItemVm } from '@/app/entities/inventory/models/product-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { goodsReceiptTotalCost } from '@/app/features/inventory/utils/goods-receipt.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';

type SelectOption = { label: string; value: string };

const MONEY = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toProductPick(p: Pick<ProductListItemVm, 'id' | 'name' | 'sku' | 'barcode' | 'requiresLotAndExpiry'>): GoodsReceiptProductPick {
    return { id: p.id, label: `${p.name} (${p.sku})`, barcode: p.barcode, requiresLotAndExpiry: p.requiresLotAndExpiry };
}

/**
 * Mal kabul: tek fatura/irsaliyeden N ürünün tek işlemde (hepsi ya da hiçbiri) stoğa girişi.
 * Kurallar (lot/SKT zorunluluğu, geçmiş SKT onayı, atomiklik) backend'dedir; burada yalnız erken geri bildirim vardır.
 */
@Component({
    selector: 'app-goods-receipt-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule, AutoCompleteModule, BarcodeScanButtonComponent, DateInputComponent, AppListHeaderComponent, InlineCreateDirective, InlineCreateOptionComponent, QuickProductDialogComponent, ReadOnlyReasonDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            <app-list-header class="mb-4" title="Mal kabul" />
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; mal kabul kaydedilemez.</p>
            }

            @if (result(); as r) {
                <div class="flex flex-col gap-3 items-start" role="status" data-testid="goods-receipt-success">
                    <h5 class="m-0">
                        @if (r.created) {
                            {{ r.lineCount }} satır kaydedildi
                        } @else {
                            Daha önce kaydedilmişti
                        }
                    </h5>
                    <p class="m-0 text-muted-color">
                        @if (r.created) {
                            Ürünler stoğa eklendi.
                        } @else {
                            Bu mal kabul zaten alınmış ({{ r.lineCount }} satır); tekrar kaydedilmedi.
                        }
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <a routerLink="/panel/stocks" class="p-button p-component no-underline">Stok durumuna git</a>
                        <button pButton type="button" severity="secondary" (click)="startNew()"><i class="p-button-icon pi pi-plus"></i>Yeni mal kabul</button>
                    </div>
                </div>
            } @else {
                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5" novalidate>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                            <label for="grClinic" class="block text-sm font-medium text-muted-color">Klinik *</label>
                            <p-select inputId="grClinic" formControlName="clinicId" [options]="clinicOptions()" optionLabel="label" optionValue="value" placeholder="Klinik seçin" class="w-full" [loading]="clinicsLoading()" />
                            @if (form.controls.clinicId.invalid && form.controls.clinicId.touched) {
                                <small class="text-danger">Klinik seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-8 flex flex-col gap-1">
                            <label for="grSupplier" class="block text-sm font-medium text-muted-color">Firma / tedarikçi</label>
                            <input id="grSupplier" pInputText class="w-full" type="text" formControlName="supplierName" autocomplete="off" [attr.maxlength]="supplierMax" />
                        </div>
                        <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                            <label for="grInvoice" class="block text-sm font-medium text-muted-color">Fatura no</label>
                            <input id="grInvoice" pInputText class="w-full" type="text" formControlName="invoiceNumber" autocomplete="off" [attr.maxlength]="invoiceMax" />
                        </div>
                        <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                            <label for="grInvoiceDate" class="block text-sm font-medium text-muted-color">Fatura tarihi</label>
                            <app-date-input inputId="grInvoiceDate" type="date" formControlName="invoiceDate" limit="past" />
                        </div>
                        <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                            <label for="grReceived" class="block text-sm font-medium text-muted-color">Geliş / teslim tarihi</label>
                            <app-date-input inputId="grReceived" type="date" formControlName="receivedDate" limit="past" />
                        </div>
                    </div>

                    <div>
                        <button type="button" class="p-0 bg-transparent border-0 text-primary cursor-pointer text-sm font-medium" [attr.aria-expanded]="shippingOpen()" (click)="shippingOpen.set(!shippingOpen())">
                            <i class="pi" [class.pi-chevron-down]="shippingOpen()" [class.pi-chevron-right]="!shippingOpen()"></i>
                            Sevkiyat ayrıntıları (depo çıkış tarihi, nakil şekli, soğuk zincir)
                        </button>
                        @if (shippingOpen() || form.hasError('dispatchedAfterReceived')) {
                            <div class="grid grid-cols-12 gap-4 mt-3">
                                <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                                    <label for="grDispatched" class="block text-sm font-medium text-muted-color">Depo çıkış tarihi</label>
                                    <app-date-input inputId="grDispatched" type="date" formControlName="dispatchedDate" limit="past" />
                                </div>
                                <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                                    <label for="grTransport" class="block text-sm font-medium text-muted-color">Nakil şekli</label>
                                    <input id="grTransport" pInputText class="w-full" type="text" formControlName="transportMethod" autocomplete="off" [attr.maxlength]="transportMax" />
                                </div>
                                <div class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                                    <label for="grColdChain" class="block text-sm font-medium text-muted-color">Soğuk zincir izleme cihazı</label>
                                    <input id="grColdChain" pInputText class="w-full" type="text" formControlName="coldChainMonitor" autocomplete="off" [attr.maxlength]="transportMax" />
                                </div>
                                @if (form.hasError('dispatchedAfterReceived')) {
                                    <small class="col-span-12 text-danger" role="alert">Depo çıkış tarihi geliş / teslim tarihinden sonra olamaz.</small>
                                }
                            </div>
                        }
                    </div>

                    <div>
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h5 class="m-0">Ürünler</h5>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-xs text-muted-color">Ürünü barkod veya adla arayın. Satırda Enter yeni satır açar.</span>
                                <app-barcode-scan-button label="Barkod okut" [disabled]="lines.length >= maxLines && !hasEmptyLine()" (scanned)="onScanned($event)" />
                            </div>
                        </div>
                        @if (scanNotice(); as notice) {
                            <p class="text-danger text-sm mt-0 mb-2" role="alert" data-testid="gr-scan-notice">{{ notice }}</p>
                        }
                        @if (phone()) {
                            <!-- Telefonda (S-03): girilen satır tek satır özete iner, aynı anda tek satır açık düzenlenir; eksik zorunlu seri/lot özet satırında kırmızı. -->
                            <div class="rounded-border border border-surface-200 dark:border-surface-700 overflow-hidden" data-testid="gr-phone-lines">
                                @for (line of lines.controls; track line; let i = $index) {
                                    @if (openLine() === line) {
                                        <div class="p-3 flex flex-col gap-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800" [attr.data-testid]="'gr-row-' + i">
                                            <div class="flex items-start gap-2">
                                                <span class="pt-3 text-sm text-muted-color tabular-nums w-5 shrink-0">{{ i + 1 }}</span>
                                                <div class="flex-1 min-w-0">
                                                    <label class="block text-xs font-medium text-muted-color mb-1" [attr.for]="'gr-product-' + i">Ürün *</label>
                                                    <ng-container *ngTemplateOutlet="productField; context: { $implicit: line, i: i }" />
                                                </div>
                                            </div>
                                            <div class="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label class="block text-xs font-medium text-muted-color mb-1" [attr.for]="'gr-qty-' + i">Miktar *</label>
                                                    <input pInputText class="w-full" [id]="'gr-qty-' + i" type="number" inputmode="decimal" step="any" min="0" [formControl]="line.controls.quantity" [class.p-invalid]="line.controls.quantity.invalid && line.controls.quantity.touched" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-muted-color mb-1" [attr.for]="'gr-cost-' + i">Birim maliyet</label>
                                                    <input pInputText class="w-full" [id]="'gr-cost-' + i" type="number" inputmode="decimal" step="0.01" min="0" [formControl]="line.controls.unitCost" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-muted-color mb-1" [attr.for]="'gr-lot-' + i">Seri / lot no @if (requiresLot(line)) {<span class="text-danger">· Zorunlu</span>}</label>
                                                    <input
                                                        pInputText
                                                        class="w-full"
                                                        [id]="'gr-lot-' + i"
                                                        type="text"
                                                        autocomplete="off"
                                                        [formControl]="line.controls.lotNumber"
                                                        [attr.maxlength]="lotMax"
                                                        [attr.aria-required]="requiresLot(line)"
                                                        [class.p-invalid]="line.controls.lotNumber.touched && line.hasError('lotRequired')"
                                                    />
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-muted-color mb-1" [attr.for]="'gr-expiry-' + i">SKT @if (requiresLot(line)) {<span class="text-danger">· Zorunlu</span>}</label>
                                                    <app-date-input [inputId]="'gr-expiry-' + i" type="date" [formControl]="line.controls.expiryDate" limit="planned" />
                                                </div>
                                            </div>
                                            @if (rowNotes(line, i); as notes) {
                                                <ng-container *ngTemplateOutlet="rowNotesField; context: { $implicit: notes, line: line, i: i }" />
                                            }
                                            <div class="flex items-center gap-2">
                                                <button pButton type="button" (click)="closeLine(line)" data-testid="gr-line-done"><i class="p-button-icon pi pi-check"></i>Tamam</button>
                                                <button pButton type="button" severity="danger" [outlined]="true" [disabled]="lines.length === 1" (click)="removeLine(i)" data-testid="gr-line-remove"><i class="p-button-icon pi pi-trash"></i>Sil</button>
                                                <span class="ml-auto text-sm">Tutar <b class="tabular-nums">{{ lineTotalText(line) }}</b></span>
                                            </div>
                                        </div>
                                    } @else {
                                        @let s = lineSummary(line, i);
                                        <button
                                            type="button"
                                            class="w-full flex items-center gap-3 min-h-(--touch-target) px-3 py-2 text-left bg-transparent border-0 border-b border-surface-200 dark:border-surface-700 cursor-pointer text-color"
                                            aria-expanded="false"
                                            (click)="openLine.set(line)"
                                            [attr.data-testid]="'gr-line-summary-' + i"
                                        >
                                            <span class="text-sm text-muted-color tabular-nums w-5 shrink-0">{{ i + 1 }}</span>
                                            <span class="flex-1 min-w-0">
                                                <span class="block truncate font-medium">{{ s.title }}</span>
                                                @if (s.detail) {
                                                    <span class="block truncate text-sm text-muted-color tabular-nums">{{ s.detail }}</span>
                                                }
                                                @if (s.problem) {
                                                    <span class="block text-sm text-danger" data-testid="gr-line-problem"><i class="pi pi-exclamation-circle text-xs mr-1" aria-hidden="true"></i>{{ s.problem }}</span>
                                                }
                                            </span>
                                            <span class="shrink-0 text-sm font-semibold tabular-nums">{{ lineTotalText(line) }}</span>
                                            <i class="pi pi-chevron-down text-xs text-muted-color" aria-hidden="true"></i>
                                        </button>
                                    }
                                }
                            </div>
                        } @else {                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse" style="min-width: 52rem" formArrayName="lines">
                                <thead>
                                    <tr class="text-left text-sm text-muted-color">
                                        <th class="p-2 w-8">#</th>
                                        <th class="p-2" style="min-width: 16rem">Ürün *</th>
                                        <th class="p-2 w-28">Miktar *</th>
                                        <th class="p-2 w-40">Seri / lot no</th>
                                        <th class="p-2 w-44">SKT</th>
                                        <th class="p-2 w-32">Birim maliyet</th>
                                        <th class="p-2 w-24 text-right">Tutar</th>
                                        <th class="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (line of lines.controls; track line; let i = $index) {
                                        <tr [formGroupName]="i" (keydown.enter)="onRowEnter($event, i)" class="align-top" [attr.data-testid]="'gr-row-' + i">
                                            <td class="p-2 text-muted-color text-sm pt-4">{{ i + 1 }}</td>
                                            <td class="p-2">
                                                <ng-container *ngTemplateOutlet="productField; context: { $implicit: line, i: i }" />
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    pInputText
                                                    class="w-full"
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    formControlName="quantity"
                                                    [attr.aria-label]="'Miktar, satır ' + (i + 1)"
                                                    [class.p-invalid]="line.controls.quantity.invalid && line.controls.quantity.touched"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    pInputText
                                                    class="w-full"
                                                    type="text"
                                                    formControlName="lotNumber"
                                                    autocomplete="off"
                                                    [attr.maxlength]="lotMax"
                                                    [attr.aria-required]="requiresLot(line)"
                                                    [attr.aria-label]="'Seri / lot no, satır ' + (i + 1)"
                                                    [placeholder]="requiresLot(line) ? 'Zorunlu' : ''"
                                                    [class.p-invalid]="line.controls.lotNumber.touched && line.hasError('lotRequired')"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <app-date-input [inputId]="'gr-expiry-' + i" type="date" formControlName="expiryDate" limit="planned" />
                                                @if (requiresLot(line)) {
                                                    <small class="text-muted-color">Zorunlu</small>
                                                }
                                            </td>
                                            <td class="p-2">
                                                <input pInputText class="w-full" type="number" step="0.01" min="0" formControlName="unitCost" [attr.aria-label]="'Birim maliyet, satır ' + (i + 1)" />
                                            </td>
                                            <td class="p-2 text-right text-sm pt-4 whitespace-nowrap">{{ lineTotalText(line) }}</td>
                                            <td class="p-2">
                                                <button pButton type="button" iconOnly severity="danger" [text]="true" [disabled]="lines.length === 1" (click)="removeLine(i)" [attr.aria-label]="'Satır ' + (i + 1) + ' sil'"><i class="p-button-icon pi pi-trash"></i></button>
                                            </td>
                                        </tr>
                                        @if (rowNotes(line, i); as notes) {
                                            <tr [attr.data-testid]="'gr-row-notes-' + i">
                                                <td></td>
                                                <td colspan="7" class="px-2 pb-3">
                                                    <ng-container *ngTemplateOutlet="rowNotesField; context: { $implicit: notes, line: line, i: i }" />
                                                </td>
                                            </tr>
                                        }
                                    }
                                </tbody>
                            </table>
                        </div>
                        }
                        <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
                            <div class="flex items-center gap-3">
                                <button pButton type="button" severity="secondary" [disabled]="lines.length >= maxLines" (click)="addLine()"><i class="p-button-icon pi pi-plus"></i>Satır ekle</button>
                                <span class="text-xs text-muted-color">{{ lines.length }} / {{ maxLines }} satır</span>
                            </div>
                            <div class="text-sm">
                                Toplam maliyet: <span class="font-semibold" data-testid="gr-total">{{ totalText() }}</span>
                            </div>
                        </div>
                    </div>

                    @if (submitError(); as err) {
                        <p class="text-danger text-sm m-0" role="alert" data-testid="gr-submit-error">{{ err }}</p>
                    }
                    @if (form.invalid && attempted()) {
                        <p class="text-danger text-sm m-0" role="alert">Formda eksik veya hatalı alanlar var; kırmızı işaretli yerleri düzeltin.</p>
                    }

                    <div class="flex flex-wrap justify-end gap-2">
                        <button pButton type="submit" [disabled]="submitting() || ro.mutationBlocked()" appReadOnlyReason><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
                    </div>
                </form>
            }
        </div>
        <!-- Ürün alanı ve satır notları tabloda ve telefonda aynı (tek yer); alan grubu bağlamı gerekmesin diye [formControl]. -->
        <ng-template #productField let-line let-i="i">
            <p-autocomplete
                [inputId]="'gr-product-' + i"
                [formControl]="line.controls.product"
                [suggestions]="suggestions()"
                (completeMethod)="onProductSearch($event)"
                optionLabel="label"
                [delay]="250"
                [minQueryLength]="2"
                [autoHighlight]="true"
                [fluid]="true"
                placeholder="Barkod veya ürün adı"
                [showEmptyMessage]="true"
                [appInlineCreate]="productCreate()"
                appendTo="body"
            >
                <ng-template #empty><app-inline-create-option /></ng-template>
                <ng-template #item let-p>
                    <div class="flex flex-col">
                        <span>{{ p.label }}</span>
                        @if (p.barcode) {
                            <span class="text-xs text-muted-color">Barkod: {{ p.barcode }}</span>
                        }
                    </div>
                </ng-template>
            </p-autocomplete>
            @if (line.controls.product.touched && line.hasError('productMissing')) {
                <small class="text-danger">Listeden bir ürün seçin.</small>
            }
        </ng-template>
        <ng-template #rowNotesField let-notes let-line="line" let-i="i">
            <div class="flex flex-col gap-1 text-sm">
                @for (n of notes.errors; track n) {
                    <span class="text-danger" role="alert">{{ n }}</span>
                }
                @if (notes.expired) {
                    <label class="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" [formControl]="line.controls.acknowledgeExpired" [attr.data-testid]="'gr-ack-' + i" class="mt-0.5" />
                        <span>Bu satırın son kullanma tarihi geçmiş; süresi geçmiş partiyi kabul ediyorum.</span>
                    </label>
                }
            </div>
        </ng-template>
        <app-quick-product-dialog [(visible)]="quickProductOpen" [initialName]="quickProductName()" [kinds]="stockKinds" (productCreated)="onQuickProductCreated($event)" />
    `
})
export class GoodsReceiptPageComponent implements OnInit, HasUnsavedChanges {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    private readonly clinics = inject(ClinicsService);
    private readonly productService = inject(ProductService);
    private readonly goodsReceipts = inject(GoodsReceiptService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    protected readonly maxLines = GOODS_RECEIPT_MAX_LINES;
    protected readonly lotMax = STOCK_BATCH_LOT_MAX;
    protected readonly supplierMax = STOCK_BATCH_SUPPLIER_MAX;
    protected readonly invoiceMax = STOCK_BATCH_INVOICE_MAX;
    protected readonly transportMax = STOCK_BATCH_TRANSPORT_MAX;

    readonly form = createGoodsReceiptFormGroup(this.fb);
    readonly shippingOpen = signal(false);
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly clinicsLoading = signal(false);
    readonly suggestions = signal<GoodsReceiptProductPick[]>([]);
    readonly quickProductOpen = signal(false);
    readonly quickProductName = signal('');
    /** Mal kabul yalnız stok takipli ürünle olur; hızlı üründe Hizmet sunulmaz. */
    readonly stockKinds = ['Other', 'Medicine', 'Vaccine'] as const;
    private quickProductTarget: AbstractControl | null = null;
    /** Aranan ürün yoksa küçük ürün diyaloğu açılır; yeni ürün o satıra yazılır (O1). Yeni ürün en sık burada gelir. */
    readonly productCreate = computed<InlineCreateConfig>(() => ({
        canCreate: this.auth.hasOperationClaim(PRODUCTS_CREATE_CLAIM) && !this.ro.mutationBlocked(),
        openDialog: (name, control) => {
            this.quickProductTarget = control;
            this.quickProductName.set(name);
            this.quickProductOpen.set(true);
        }
    }));
    readonly submitting = signal(false);
    readonly attempted = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly result = signal<GoodsReceiptResultVm | null>(null);
    readonly scanNotice = signal<string | null>(null);
    /** Telefon genişliği (S-03): ürün satırları tablo yerine özet satırlar; aynı anda tek satır açık. */
    readonly phone = signal(false);
    /** Telefonda açık düzenlenen satır; yeni ve barkodla dolan satır açılır. */
    readonly openLine = signal<GoodsReceiptLineGroup | null>(null);
    private readonly lineErrors = signal<Readonly<Record<number, string>>>({});

    /** Form açılışında bir kez üretilir; hata sonrası tekrar denemelerde aynı kalır, yalnız yeni mal kabulde yenilenir. */
    private requestId = crypto.randomUUID();
    private readonly productSearch$ = new Subject<string>();
    private readonly linesChanged = toSignal(this.lines.valueChanges.pipe(startWith(null)));
    protected readonly totalText = computed(() => {
        this.linesChanged();

        return MONEY.format(goodsReceiptTotalCost(this.lines.getRawValue()));
    });

    get lines() {
        return this.form.controls.lines;
    }

    constructor() {
        this.productSearch$
            .pipe(
                switchMap((term) => this.productService.getProducts({ search: term, page: 1, pageSize: 20, isActive: true, stockTrackedOnly: true }).pipe(catchError(() => of(null)))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((r) => this.suggestions.set((r?.items ?? []).map(toProductPick)));
    }

    ngOnInit(): void {
        this.watchPhoneViewport();
        this.openLine.set(this.lines.at(0));
        const q = this.route.snapshot.queryParamMap;

        this.loadClinics(q.get('clinicId')?.trim() || this.auth.getClinicId()?.trim() || '');
        const productId = q.get('productId')?.trim();

        if (productId) {
            this.prefillLine(productId, Number(q.get('quantity')));
        }
    }

    /** Satır ekleme/silme ve barkodla gelen ürün programla yazılır; onlar da kirli işaretlenir. */
    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

    onQuickProductCreated(product: QuickProductCreated): void {
        const control = this.quickProductTarget;

        this.quickProductTarget = null;
        control?.setValue({ id: product.id, label: product.name, barcode: '', requiresLotAndExpiry: false } satisfies GoodsReceiptProductPick);
        control?.markAsDirty();
    }

    onProductSearch(event: AutoCompleteCompleteEvent): void {
        const term = event.query.trim();

        if (term) {
            this.productSearch$.next(term);
        }
    }

    hasEmptyLine(): boolean {
        return this.lines.controls.some((l) => !l.controls.product.value);
    }

    /** Kamerayla okunan barkod (TIER-006): stok takipli aktif ürün ilk boş satıra, boş satır yoksa yeni satıra yazılır; miktara geçilir. */
    onScanned(code: string): void {
        this.scanNotice.set(null);
        this.productService.findByBarcode(code, { isActive: true, stockTrackedOnly: true }).subscribe({
            next: (p) => {
                if (!p) {
                    this.scanNotice.set(`"${code}" barkodlu, stok takipli aktif ürün bulunamadı. Ürünü adla arayabilirsiniz.`);

                    return;
                }

                const line = this.lines.controls.find((l) => !l.controls.product.value) ?? this.addLine();

                if (!line) {
                    this.scanNotice.set(`En çok ${this.maxLines} satır eklenebilir.`);

                    return;
                }

                line.patchValue({ product: toProductPick(p) });
                line.markAsDirty();
                this.openLine.set(line);
                const index = this.lines.controls.indexOf(line);

                setTimeout(() => document.querySelector<HTMLInputElement>(`[data-testid="gr-row-${index}"] input[formcontrolname="quantity"], #gr-qty-${index}`)?.focus());
            },
            error: (e: Error) => this.scanNotice.set(e.message)
        });
    }

    addLine(): GoodsReceiptLineGroup | null {
        if (this.lines.length >= GOODS_RECEIPT_MAX_LINES) {
            return null;
        }

        const line = createGoodsReceiptLineGroup(this.fb);

        this.lines.push(line);
        this.lines.markAsDirty();
        this.openLine.set(line);

        return line;
    }

    removeLine(index: number): void {
        if (this.lines.length > 1) {
            if (this.openLine() === this.lines.at(index)) {
                this.openLine.set(null);
            }

            this.lines.removeAt(index);
            this.lines.markAsDirty();
            this.lineErrors.set({});
        }
    }

    /** Ürün alanı dışındaki girdide Enter: sonraki satırın ürününe geç, son satırsa yeni satır aç. */
    onRowEnter(event: Event, index: number): void {
        const target = event.target as HTMLElement;

        if (target.tagName !== 'INPUT' || (target as HTMLInputElement).type === 'checkbox' || target.closest('p-autocomplete')) {
            return;
        }

        event.preventDefault();

        if (index === this.lines.length - 1 && !this.addLine()) {
            return;
        }

        setTimeout(() => document.getElementById(`gr-product-${index + 1}`)?.focus());
    }

    requiresLot(line: GoodsReceiptLineGroup): boolean {
        const p = line.controls.product.value;

        return !!p && typeof p !== 'string' && p.requiresLotAndExpiry;
    }

    lineTotalText(line: GoodsReceiptLineGroup): string {
        const { quantity, unitCost } = line.getRawValue();

        return goodsReceiptTotalCost([{ quantity, unitCost }]) > 0 ? MONEY.format(goodsReceiptTotalCost([{ quantity, unitCost }])) : '—';
    }

    /** Satır altı notları: sunucu hatası, zorunlu seri/SKT uyarısı ve geçmiş SKT onayı. */
    rowNotes(line: GoodsReceiptLineGroup, index: number): { errors: string[]; expired: boolean } | null {
        const errors: string[] = [];
        const server = this.lineErrors()[index];

        if (server) {
            errors.push(server);
        }

        const showLocal = line.touched || this.attempted();

        if (showLocal && (line.hasError('lotRequired') || line.hasError('expiryRequired'))) {
            errors.push('Aşı ve kontrollü ürünlerde seri/lot no ile son kullanma tarihi zorunludur.');
        }

        const expired = isStockBatchExpiryPast(line.controls.expiryDate.value);

        if (line.hasError('expiredNotAcknowledged') && showLocal) {
            errors.push('Son kullanma tarihi geçmiş; kaydetmek için bu satırı onaylayın.');
        }

        return errors.length > 0 || expired ? { errors, expired } : null;
    }

    /** "Tamam": satır özete iner; eksik zorunlu alan özet satırında görünsün diye dokunulmuş sayılır. */
    closeLine(line: GoodsReceiptLineGroup): void {
        line.markAllAsTouched();
        this.openLine.set(null);
    }

    /** Telefon özet satırı: ürün; miktar × birim maliyet · lot · SKT (ay.yıl); eksik zorunlu alan ya da satır hatası kırmızı. */
    lineSummary(line: GoodsReceiptLineGroup, index: number): { title: string; detail: string; problem: string | null } {
        const { product, quantity, unitCost, lotNumber, expiryDate } = line.getRawValue();
        const title = product ? (typeof product === 'string' ? product : product.label) : 'Boş satır';
        const detail = product
            ? [
                  quantity != null && `${quantity} × ${MONEY.format(Number(unitCost) || 0)}`,
                  lotNumber?.trim() && `Lot ${lotNumber.trim()}`,
                  expiryDate && `SKT ${expiryDate.slice(5, 7)}.${expiryDate.slice(0, 4)}`
              ]
                  .filter(Boolean)
                  .join(' · ')
            : 'Dokunup ürün seçin';
        const missing =
            product && line.hasError('productMissing') ? 'Listeden bir ürün seçin' : line.hasError('lotRequired') || line.hasError('expiryRequired') ? 'Seri/lot ve SKT zorunlu' : null;

        return { title, detail, problem: this.lineErrors()[index] ?? missing ?? this.rowNotes(line, index)?.errors[0] ?? null };
    }

    private watchPhoneViewport(): void {
        const query = window.matchMedia('(max-width: 575px)');
        const update = () => this.phone.set(query.matches);

        update();
        query.addEventListener('change', update);
        this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
    }

    onSubmit(): void {        if (this.ro.mutationBlocked() || this.submitting()) {
            return;
        }

        this.attempted.set(true);
        this.form.markAllAsTouched();
        this.submitError.set(null);
        this.lineErrors.set({});

        if (this.form.invalid) {
            return;
        }

        this.submitting.set(true);
        this.goodsReceipts.create(mapGoodsReceiptFormToRequest(this.form, this.requestId)).subscribe({
            next: (r) => {
                this.submitting.set(false);
                this.form.markAsPristine();
                this.result.set(r);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(e instanceof Error ? e.message : 'Mal kabul kaydedilemedi.');
                this.lineErrors.set(e instanceof GoodsReceiptSubmitError ? e.lineErrors : {});
            }
        });
    }

    /** Başarıdan sonra temiz form ve yeni `requestId`. */
    startNew(): void {
        const clinicId = this.form.controls.clinicId.value;

        this.form.reset({ clinicId });
        this.lines.clear();
        this.lines.push(createGoodsReceiptLineGroup(this.fb));
        this.openLine.set(this.lines.at(0));
        this.requestId = crypto.randomUUID();
        this.attempted.set(false);
        this.submitError.set(null);
        this.lineErrors.set({});
        this.result.set(null);
    }

    private prefillLine(productId: string, quantity: number): void {
        this.productService.getById(productId).subscribe({
            next: (p) => {
                const line = this.lines.at(0);

                line.patchValue({
                    product: toProductPick(p),
                    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null
                });
            },
            error: () => this.submitError.set('Önerilen ürün yüklenemedi; ürünü elle seçin.')
        });
    }

    private loadClinics(preferredClinicId: string): void {
        this.clinicsLoading.set(true);
        this.clinics.listClinics().subscribe({
            next: (rows) => {
                this.clinicsLoading.set(false);
                const opts: SelectOption[] = rows.filter((c) => c.isActive !== false).map((c) => ({ label: c.name.trim() ? c.name : c.id, value: c.id }));

                this.clinicOptions.set(opts);
                const cid = preferredClinicId || (opts.length === 1 ? opts[0].value : '');

                if (cid && !opts.some((o) => o.value === cid)) {
                    this.clinicOptions.set([{ label: this.auth.getClinicName()?.trim() || 'Aktif klinik', value: cid }, ...opts]);
                }

                this.form.patchValue({ clinicId: cid });
            },
            error: () => {
                this.clinicsLoading.set(false);

                if (preferredClinicId) {
                    this.clinicOptions.set([{ label: this.auth.getClinicName()?.trim() || 'Aktif klinik', value: preferredClinicId }]);
                    this.form.patchValue({ clinicId: preferredClinicId });
                }
            }
        });
    }
}
