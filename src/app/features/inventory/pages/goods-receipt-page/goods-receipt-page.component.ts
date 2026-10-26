import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { mapGoodsReceiptFormToRequest } from '@/app/features/inventory/data/goods-receipt.mapper';
import { createGoodsReceiptFormGroup, createGoodsReceiptLineGroup, type GoodsReceiptLineGroup } from '@/app/features/inventory/forms/goods-receipt-form.factory';
import { isStockBatchExpiryPast, STOCK_BATCH_INVOICE_MAX, STOCK_BATCH_LOT_MAX, STOCK_BATCH_SUPPLIER_MAX, STOCK_BATCH_TRANSPORT_MAX } from '@/app/features/inventory/forms/stock-batch-form.factory';
import { GOODS_RECEIPT_MAX_LINES } from '@/app/features/inventory/models/goods-receipt-api.model';
import { GoodsReceiptSubmitError, type GoodsReceiptProductPick, type GoodsReceiptResultVm } from '@/app/features/inventory/models/goods-receipt-form.model';
import { GoodsReceiptService } from '@/app/features/inventory/services/goods-receipt.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { goodsReceiptTotalCost } from '@/app/features/inventory/utils/goods-receipt.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';

type SelectOption = { label: string; value: string };

const MONEY = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Mal kabul: tek fatura/irsaliyeden N ürünün tek işlemde (hepsi ya da hiçbiri) stoğa girişi.
 * Kurallar (lot/SKT zorunluluğu, geçmiş SKT onayı, atomiklik) backend'dedir; burada yalnız erken geri bildirim vardır.
 */
@Component({
    selector: 'app-goods-receipt-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule, AutoCompleteModule, DateInputComponent, AppListHeaderComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
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
                        <p-button label="Yeni mal kabul" icon="pi pi-plus" severity="secondary" (onClick)="startNew()" />
                    </div>
                </div>
            } @else {
                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5" novalidate>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                            <label for="grClinic" class="block text-sm font-medium text-muted-color">Klinik *</label>
                            <p-select inputId="grClinic" formControlName="clinicId" [options]="clinicOptions()" optionLabel="label" optionValue="value" placeholder="Klinik seçin" class="w-full" [loading]="clinicsLoading()" />
                            @if (form.controls.clinicId.invalid && form.controls.clinicId.touched) {
                                <small class="text-red-500">Klinik seçimi zorunludur.</small>
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
                                    <small class="col-span-12 text-red-500" role="alert">Depo çıkış tarihi geliş / teslim tarihinden sonra olamaz.</small>
                                }
                            </div>
                        }
                    </div>

                    <div>
                        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                            <h5 class="m-0">Ürünler</h5>
                            <span class="text-xs text-muted-color">Ürünü barkod veya adla arayın. Satırda Enter yeni satır açar.</span>
                        </div>
                        <div class="overflow-x-auto">
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
                                                <p-autocomplete
                                                    [inputId]="'gr-product-' + i"
                                                    formControlName="product"
                                                    [suggestions]="suggestions()"
                                                    (completeMethod)="onProductSearch($event)"
                                                    optionLabel="label"
                                                    [delay]="250"
                                                    [minQueryLength]="2"
                                                    [autoHighlight]="true"
                                                    [fluid]="true"
                                                    placeholder="Barkod veya ürün adı"
                                                    emptyMessage="Eşleşen ürün bulunamadı."
                                                    appendTo="body"
                                                >
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
                                                    <small class="text-red-500">Listeden bir ürün seçin.</small>
                                                }
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
                                                <p-button type="button" icon="pi pi-trash" severity="danger" [text]="true" [disabled]="lines.length === 1" (onClick)="removeLine(i)" [attr.aria-label]="'Satır ' + (i + 1) + ' sil'" />
                                            </td>
                                        </tr>
                                        @if (rowNotes(line, i); as notes) {
                                            <tr [attr.data-testid]="'gr-row-notes-' + i">
                                                <td></td>
                                                <td colspan="7" class="px-2 pb-3 flex flex-col gap-1 text-sm">
                                                    @for (n of notes.errors; track n) {
                                                        <span class="text-red-600 dark:text-red-400" role="alert">{{ n }}</span>
                                                    }
                                                    @if (notes.expired) {
                                                        <label class="flex items-start gap-2 cursor-pointer" [formGroupName]="i">
                                                            <input type="checkbox" formControlName="acknowledgeExpired" [attr.data-testid]="'gr-ack-' + i" class="mt-0.5" />
                                                            <span>Bu satırın son kullanma tarihi geçmiş; süresi geçmiş partiyi kabul ediyorum.</span>
                                                        </label>
                                                    }
                                                </td>
                                            </tr>
                                        }
                                    }
                                </tbody>
                            </table>
                        </div>
                        <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
                            <div class="flex items-center gap-3">
                                <p-button type="button" label="Satır ekle" icon="pi pi-plus" severity="secondary" [disabled]="lines.length >= maxLines" (onClick)="addLine()" />
                                <span class="text-xs text-muted-color">{{ lines.length }} / {{ maxLines }} satır</span>
                            </div>
                            <div class="text-sm">
                                Toplam maliyet: <span class="font-semibold" data-testid="gr-total">{{ totalText() }}</span>
                            </div>
                        </div>
                    </div>

                    @if (submitError(); as err) {
                        <p class="text-red-500 text-sm m-0" role="alert" data-testid="gr-submit-error">{{ err }}</p>
                    }
                    @if (form.invalid && attempted()) {
                        <p class="text-red-500 text-sm m-0" role="alert">Formda eksik veya hatalı alanlar var; kırmızı işaretli yerleri düzeltin.</p>
                    }

                    <div class="flex flex-wrap justify-end gap-2">
                        <p-button type="submit" label="Kaydet" icon="pi pi-check" [loading]="submitting()" [disabled]="submitting() || ro.mutationBlocked()" />
                    </div>
                </form>
            }
        </div>
    `
})
export class GoodsReceiptPageComponent implements OnInit {
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
    readonly submitting = signal(false);
    readonly attempted = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly result = signal<GoodsReceiptResultVm | null>(null);
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
            .subscribe((r) => this.suggestions.set((r?.items ?? []).map((p) => ({ id: p.id, label: `${p.name} (${p.sku})`, barcode: p.barcode, requiresLotAndExpiry: p.requiresLotAndExpiry }))));
    }

    ngOnInit(): void {
        const q = this.route.snapshot.queryParamMap;

        this.loadClinics(q.get('clinicId')?.trim() || this.auth.getClinicId()?.trim() || '');
        const productId = q.get('productId')?.trim();

        if (productId) {
            this.prefillLine(productId, Number(q.get('quantity')));
        }
    }

    onProductSearch(event: AutoCompleteCompleteEvent): void {
        const term = event.query.trim();

        if (term) {
            this.productSearch$.next(term);
        }
    }

    addLine(): GoodsReceiptLineGroup | null {
        if (this.lines.length >= GOODS_RECEIPT_MAX_LINES) {
            return null;
        }

        const line = createGoodsReceiptLineGroup(this.fb);

        this.lines.push(line);

        return line;
    }

    removeLine(index: number): void {
        if (this.lines.length > 1) {
            this.lines.removeAt(index);
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

    onSubmit(): void {
        if (this.ro.mutationBlocked() || this.submitting()) {
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
                    product: { id: p.id, label: `${p.name} (${p.sku})`, barcode: p.barcode, requiresLotAndExpiry: p.requiresLotAndExpiry },
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
