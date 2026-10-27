import { Component, DestroyRef, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_UPDATE_CLAIM, STOCK_MOVEMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import type { ProductDetailVm } from '@/app/entities/inventory/models/product-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { StockBatchFieldsComponent } from '@/app/features/inventory/components/stock-batch-fields/stock-batch-fields.component';
import {
    createProductStockOperationFormGroup,
    optionalNonNegativeNumberValidator,
    parseNonNegativeFormNumber,
    parsePositiveFormNumber,
    stockMovementAmountPositiveValidator,
    type StockOperationKind
} from '@/app/features/inventory/forms/product-stock-operation-form.factory';
import { getAcknowledgeExpiredRequest, getStockBatchRequest, syncStockBatchGroup } from '@/app/features/inventory/forms/stock-batch-form.factory';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

/**
 * Ürün detayı stok işlemi diyaloğu: stok girişi, çıkışı ve minimum stok. Sayfa `openForRow` / `openFromHeader` ile açar;
 * açma yetkisi (salt okunur değil, işlem hakkı var) denetimi sayfadadır. Kayıttan sonra `saved` yayılır.
 */
@Component({
    selector: 'app-product-stock-operation-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, SelectModule, SelectButtonModule, TextareaModule, StockBatchFieldsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog header="Stok işlemi" [modal]="true" [visible]="stockOperationDialogOpen()" (visibleChange)="onStockOperationDialogVisibleChange($event)" [style]="{ width: 'min(36rem, 95vw)' }" [draggable]="false">
            <form [formGroup]="stockOperationForm" (ngSubmit)="onStockOperationSubmit()" class="flex flex-col gap-4">
                @if (showStockClinicPicker()) {
                    <div class="flex flex-col gap-1">
                        <label for="soClinicPick" class="block text-sm font-medium text-muted-color">Klinik *</label>
                        <p-select
                            inputId="soClinicPick"
                            formControlName="clinicStockRowId"
                            [options]="stockRowPickOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Klinik seçin…"
                            [filter]="true"
                            filterPlaceholder="Ara…"
                            filterBy="label"
                            [showClear]="true"
                            class="w-full"
                        />
                        @if (stockOperationForm.controls.clinicStockRowId.invalid && stockOperationForm.controls.clinicStockRowId.touched) {
                            <small class="text-red-500">Stok işlemi için klinik seçimi gereklidir.</small>
                        }
                    </div>
                }

                @if (shouldShowStockOperationBody()) {
                    @if (editingStockRow(); as stock) {
                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-4 space-y-3" role="region" aria-label="Klinik stok özeti">
                            <div class="flex flex-col gap-1">
                                <span class="block text-sm font-medium text-muted-color">Klinik</span>
                                <span class="text-base font-medium text-surface-900 dark:text-surface-0 leading-snug">{{ stock.clinicName }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Kullanılabilir stok</span>
                                    <span class="text-base tabular-nums text-surface-900 dark:text-surface-0">{{ stock.availableText }}</span>
                                    @if (stock.hasExpired) {
                                        <span class="text-sm tabular-nums text-red-600 dark:text-red-400">+ {{ stock.expiredText }} süresi geçmiş</span>
                                    }
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Minimum stok</span>
                                    <span class="text-base tabular-nums text-surface-900 dark:text-surface-0">{{ stock.minimumStockLevelText }}</span>
                                </div>
                            </div>
                        </div>
                    } @else if (stockOperationActiveClinicFallback()) {
                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-4 space-y-3" role="region" aria-label="Aktif klinik stok özeti">
                            <div class="flex flex-col gap-1">
                                <span class="block text-sm font-medium text-muted-color">Klinik</span>
                                <span class="text-base font-medium text-surface-900 dark:text-surface-0 leading-snug">{{ headerActiveClinicDisplayName() }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Mevcut stok</span>
                                    <span class="text-base tabular-nums text-muted-color">—</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Minimum stok</span>
                                    <span class="text-base tabular-nums text-muted-color">—</span>
                                </div>
                            </div>
                            <p class="text-sm text-muted-color m-0 leading-relaxed">Bu ürün için seçili klinikte henüz stok kaydı yok; stok girişi veya çıkışı ile hareket oluşturabilirsiniz.</p>
                        </div>
                    }

                    <div class="flex flex-col gap-2">
                        <label class="block text-sm font-medium text-muted-color">İşlem tipi</label>
                        <p-selectbutton formControlName="operationType" [options]="stockOperationTypeSelectOptions()" optionLabel="label" optionValue="value" [allowEmpty]="false" styleClass="flex-wrap w-full" aria-label="İşlem tipi" />
                    </div>

                    @if (stockOperationForm.controls.operationType.value === 'in') {
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <label for="soAmountIn" class="block text-sm font-medium text-muted-color">Giriş miktarı *</label>
                                <input id="soAmountIn" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="amount" inputmode="decimal" />
                                @if (stockOperationForm.controls.amount.invalid && stockOperationForm.controls.amount.touched) {
                                    <small class="text-red-500">Miktar 0’dan büyük olmalıdır.</small>
                                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="soUnitCost" class="block text-sm font-medium text-muted-color">Birim maliyet</label>
                                <input id="soUnitCost" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="unitCost" placeholder="İsteğe bağlı" inputmode="decimal" />
                                @if (stockOperationForm.controls.unitCost.invalid && stockOperationForm.controls.unitCost.touched) {
                                    <small class="text-red-500">Birim maliyet 0’dan küçük olamaz.</small>
                                }
                            </div>
                            <app-stock-batch-fields [group]="stockOperationForm.controls.batch" [required]="product()?.requiresLotAndExpiry === true" idPrefix="soBatch" />
                            <div class="flex flex-col gap-1">
                                <label for="soNotesIn" class="block text-sm font-medium text-muted-color">Açıklama</label>
                                <textarea id="soNotesIn" pTextarea rows="3" class="w-full min-h-[4.5rem]" formControlName="notes" placeholder="İsteğe bağlı"></textarea>
                                @if (stockOperationForm.controls.notes.invalid && stockOperationForm.controls.notes.touched) {
                                    <small class="text-red-500">En fazla 2000 karakter.</small>
                                }
                            </div>
                        </div>
                    }
                    @if (stockOperationForm.controls.operationType.value === 'out') {
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <label for="soAmountOut" class="block text-sm font-medium text-muted-color">Çıkış miktarı *</label>
                                <input id="soAmountOut" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="amount" inputmode="decimal" />
                                @if (stockOperationForm.controls.amount.invalid && stockOperationForm.controls.amount.touched) {
                                    <small class="text-red-500">Miktar 0’dan büyük olmalıdır.</small>
                                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="soNotesOut" class="block text-sm font-medium text-muted-color">Açıklama</label>
                                <textarea id="soNotesOut" pTextarea rows="3" class="w-full min-h-[4.5rem]" formControlName="notes" placeholder="İsteğe bağlı"></textarea>
                                @if (stockOperationForm.controls.notes.invalid && stockOperationForm.controls.notes.touched) {
                                    <small class="text-red-500">En fazla 2000 karakter.</small>
                                }
                            </div>
                        </div>
                    }
                    @if (stockOperationForm.controls.operationType.value === 'minimum') {
                        <div class="flex flex-col gap-1">
                            <label for="soMinLevel" class="block text-sm font-medium text-muted-color">Yeni minimum stok *</label>
                            <input id="soMinLevel" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="minimumStockLevel" inputmode="decimal" />
                            @if (stockOperationForm.controls.minimumStockLevel.invalid && stockOperationForm.controls.minimumStockLevel.touched) {
                                <small class="text-red-500">Minimum stok 0’dan küçük olamaz.</small>
                            }
                        </div>
                    }
                }

                @if (stockOperationSubmitError()) {
                    <p class="text-red-500 m-0 text-sm leading-relaxed" role="alert">{{ stockOperationSubmitError() }}</p>
                }
                <div class="flex flex-wrap justify-end gap-2 pt-3 mt-1 border-t border-surface-200 dark:border-surface-700">
                    <button pButton type="button" severity="secondary" (click)="closeStockOperationDialog()" [disabled]="stockOperationSubmitting()">{{ copy.buttonCancel }}</button>
                    <button
                        pButton
                        type="submit"
                        [disabled]="stockOperationForm.invalid || stockOperationSubmitting() || ro.mutationBlocked() || stockOperationPickIncomplete()"
                    ><i class="p-button-icon" [class]="stockOperationSubmitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>
    `
})
export class ProductStockOperationDialogComponent {
    readonly product = input<ProductDetailVm | null>(null);
    /** Ürünün klinik stok satırları; üst düğmeden açılışta klinik seçimi buradan. */
    readonly stocks = input<readonly ProductStockVm[]>([]);
    readonly saved = output<void>();

    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly productService = inject(ProductService);
    private readonly stockMovementService = inject(StockMovementService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    private readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly stockOperationDialogOpen = signal(false);
    readonly editingStockRow = signal<ProductStockVm | null>(null);
    readonly stockOperationSubmitting = signal(false);
    readonly stockOperationSubmitError = signal<string | null>(null);
    /** Üst aksiyondan açıldı ve birden fazla klinik satırı var — önce klinik seçimi */
    readonly stockOperationHeaderNeedsRowPick = signal(false);
    /** Ürün için stok satırı yok; aktif klinik üzerinden giriş/çıkış */
    readonly stockOperationActiveClinicFallback = signal(false);

    readonly stockOperationForm = createProductStockOperationFormGroup(this.fb);

    /** Form başına bir kez üretilir; hata sonrası yeniden denemede aynı kalır, diyalog kapanınca yenilenir. */
    private requestId = crypto.randomUUID();

    constructor() {
        const destroyRef = inject(DestroyRef);

        this.stockOperationForm.controls.operationType.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((op) => {
            if (!op) {
                return;
            }

            if (this.stockOperationHeaderNeedsRowPick() && !this.editingStockRow()) {
                return;
            }

            this.applyOperationTypeValidators(op);
        });

        this.stockOperationForm.controls.clinicStockRowId.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((id) => {
            if (!this.stockOperationHeaderNeedsRowPick()) {
                return;
            }

            const row = id ? (this.stocks().find((r) => r.id === id) ?? null) : null;

            this.editingStockRow.set(row);

            if (row) {
                const op = this.stockOperationForm.controls.operationType.value;

                this.applyOperationTypeValidators(op);
            } else {
                this.clearQuantityValidators();
            }
        });
    }

    stockOperationTypeSelectOptions(): { label: string; value: StockOperationKind }[] {
        const o: { label: string; value: StockOperationKind }[] = [];

        if (this.canCreateStockMovement) {
            o.push({ label: 'Stok girişi', value: 'in' });
            o.push({ label: 'Stok çıkışı', value: 'out' });
        }

        const row = this.editingStockRow();

        if (this.canUpdateProduct && row) {
            o.push({ label: 'Minimum stok ayarla', value: 'minimum' });
        }

        return o;
    }

    showStockClinicPicker(): boolean {
        return this.stockOperationHeaderNeedsRowPick();
    }

    shouldShowStockOperationBody(): boolean {
        return this.editingStockRow() !== null || this.stockOperationActiveClinicFallback();
    }

    stockOperationPickIncomplete(): boolean {
        return this.stockOperationHeaderNeedsRowPick() && this.editingStockRow() === null;
    }

    headerActiveClinicDisplayName(): string {
        const name = this.auth.getClinicName()?.trim();
        const id = this.auth.getClinicId()?.trim();

        if (name) {
            return name;
        }

        if (id) {
            return id;
        }

        return '—';
    }

    stockRowPickOptions(): { label: string; value: string }[] {
        return this.stocks().map((r) => ({ label: r.clinicName, value: r.id }));
    }

    /** Üst başlık Stok işlemi: tek satırda o satır, satır yoksa aktif klinik, birden çoksa önce klinik seçimi. */
    openFromHeader(): void {
        const rows = this.stocks();

        if (rows.length === 1) {
            this.openForRow(rows[0]);

            return;
        }

        if (rows.length === 0) {
            const cid = this.auth.getClinicId()?.trim();

            if (!cid || !this.canCreateStockMovement) {
                return;
            }

            this.stockOperationHeaderNeedsRowPick.set(false);
            this.stockOperationActiveClinicFallback.set(true);
            this.editingStockRow.set(null);
            this.stockOperationSubmitError.set(null);
            this.clearClinicStockRowControl();
            const defaultOp = this.pickDefaultOperationType();

            this.resetStockOperationForm(defaultOp);
            this.applyOperationTypeValidators(defaultOp);
            this.stockOperationDialogOpen.set(true);

            return;
        }

        this.stockOperationHeaderNeedsRowPick.set(true);
        this.stockOperationActiveClinicFallback.set(false);
        this.editingStockRow.set(null);
        this.stockOperationSubmitError.set(null);
        this.stockOperationForm.controls.clinicStockRowId.setValidators([Validators.required]);
        this.resetStockOperationForm('in');
        this.clearQuantityValidators();
        this.stockOperationForm.controls.clinicStockRowId.updateValueAndValidity({ emitEvent: false });
        this.stockOperationDialogOpen.set(true);
    }

    openForRow(row: ProductStockVm): void {
        this.stockOperationHeaderNeedsRowPick.set(false);
        this.stockOperationActiveClinicFallback.set(false);
        this.clearClinicStockRowControl();
        this.editingStockRow.set(row);
        this.stockOperationSubmitError.set(null);
        const defaultOp = this.pickDefaultOperationType();

        this.resetStockOperationForm(defaultOp);
        this.applyOperationTypeValidators(defaultOp);
        this.stockOperationDialogOpen.set(true);
    }

    closeStockOperationDialog(): void {
        this.stockOperationDialogOpen.set(false);
        this.stockOperationHeaderNeedsRowPick.set(false);
        this.stockOperationActiveClinicFallback.set(false);
        this.editingStockRow.set(null);
        this.stockOperationSubmitError.set(null);
        this.clearClinicStockRowControl();
        this.resetStockOperationForm('in');
        this.applyOperationTypeValidators('in');
        this.stockOperationForm.markAsUntouched();
        this.requestId = crypto.randomUUID();
    }

    onStockOperationDialogVisibleChange(visible: boolean): void {
        if (!visible) {
            this.closeStockOperationDialog();
        }
    }

    onStockOperationSubmit(): void {
        const productId = this.product()?.id ?? null;
        const op = this.stockOperationForm.getRawValue().operationType;

        if (!productId || this.stockOperationSubmitting() || this.ro.mutationBlocked()) {
            this.stockOperationForm.markAllAsTouched();

            return;
        }

        if (this.stockOperationPickIncomplete()) {
            this.stockOperationSubmitError.set('Stok işlemi için klinik seçimi gereklidir.');
            this.stockOperationForm.controls.clinicStockRowId.markAllAsTouched();

            return;
        }

        const stock = this.editingStockRow();
        const activeFallback = this.stockOperationActiveClinicFallback();

        if (!stock && !activeFallback) {
            this.stockOperationForm.markAllAsTouched();

            return;
        }

        if (op === 'in' || op === 'out') {
            if (!this.canCreateStockMovement) {
                this.stockOperationSubmitError.set('Bu işlem için yetkiniz yok.');

                return;
            }
        } else if (op === 'minimum') {
            if (!this.canUpdateProduct) {
                this.stockOperationSubmitError.set('Bu işlem için yetkiniz yok.');

                return;
            }

            if (!stock) {
                this.stockOperationSubmitError.set('Minimum stok için ilgili klinikte ürün stok kaydı gerekir.');

                return;
            }
        }

        if (this.stockOperationForm.invalid) {
            this.stockOperationForm.markAllAsTouched();

            return;
        }

        const raw = this.stockOperationForm.getRawValue();

        if (op === 'in' || op === 'out') {
            const amount = parsePositiveFormNumber(raw.amount);

            if (amount == null) {
                this.stockOperationForm.markAllAsTouched();

                return;
            }

            const notesTrimmed = raw.notes?.trim() ?? '';
            const defaultReason = op === 'in' ? 'Stok girişi' : 'Stok çıkışı';
            const unitCost = op === 'in' ? parseNonNegativeFormNumber(raw.unitCost as number | string | null | undefined) : null;

            let clinicId: string | null = null;

            if (activeFallback) {
                clinicId = this.auth.getClinicId()?.trim() ?? null;

                if (!clinicId) {
                    this.stockOperationSubmitError.set('Stok işlemi için klinik bilgisi gerekli.');

                    return;
                }
            } else if (stock) {
                clinicId = stock.clinicId;
            }

            if (!clinicId) {
                this.stockOperationSubmitError.set('Stok işlemi için klinik bilgisi gerekli.');

                return;
            }

            this.stockOperationSubmitting.set(true);
            this.stockOperationSubmitError.set(null);
            this.stockMovementService
                .create({
                    clinicId,
                    productId,
                    movementType: op === 'in' ? 1 : 2,
                    quantity: amount,
                    unitCost,
                    reason: notesTrimmed || defaultReason,
                    referenceType: null,
                    referenceId: null,
                    occurredAtUtc: new Date().toISOString(),
                    notes: notesTrimmed === '' ? null : notesTrimmed,
                    requestId: this.requestId,
                    ...this.batchRequestFor(op)
                })
                .subscribe({
                    next: () => {
                        this.stockOperationSubmitting.set(false);
                        this.closeStockOperationDialog();
                        this.saved.emit();
                    },
                    error: (e: Error) => {
                        this.stockOperationSubmitting.set(false);
                        this.stockOperationSubmitError.set(e.message ?? 'Stok hareketi kaydedilemedi.');
                    }
                });

            return;
        }

        const newMin = raw.minimumStockLevel;

        if (newMin == null || !stock) {
            this.stockOperationForm.markAllAsTouched();

            return;
        }

        this.stockOperationSubmitting.set(true);
        this.stockOperationSubmitError.set(null);
        this.productService.updateProductStockMinimumLevel(stock.id, newMin).subscribe({
            next: () => {
                this.stockOperationSubmitting.set(false);
                this.closeStockOperationDialog();
                this.saved.emit();
            },
            error: (e: Error) => {
                this.stockOperationSubmitting.set(false);
                this.stockOperationSubmitError.set(e.message ?? 'Minimum stok güncellenemedi.');
            }
        });
    }

    private clearClinicStockRowControl(): void {
        this.stockOperationForm.controls.clinicStockRowId.clearValidators();
        this.stockOperationForm.controls.clinicStockRowId.setValue(null, { emitEvent: false });
        this.stockOperationForm.controls.clinicStockRowId.updateValueAndValidity({ emitEvent: false });
    }

    private pickDefaultOperationType(): StockOperationKind {
        if (this.canCreateStockMovement) {
            return 'in';
        }

        return 'minimum';
    }

    private applyOperationTypeValidators(op: StockOperationKind): void {
        const amountCtrl = this.stockOperationForm.controls.amount;
        const unitCostCtrl = this.stockOperationForm.controls.unitCost;
        const minCtrl = this.stockOperationForm.controls.minimumStockLevel;

        if (op === 'minimum') {
            amountCtrl.clearValidators();
            unitCostCtrl.clearValidators();
            amountCtrl.setValue(null, { emitEvent: false });
            unitCostCtrl.setValue(null, { emitEvent: false });
            minCtrl.setValidators([Validators.required, Validators.min(0)]);
            const stock = this.editingStockRow();

            if (stock) {
                minCtrl.setValue(stock.minimumStockLevel, { emitEvent: false });
            }
        } else {
            minCtrl.clearValidators();
            minCtrl.setValue(null, { emitEvent: false });
            amountCtrl.setValidators([stockMovementAmountPositiveValidator()]);
            unitCostCtrl.setValidators([optionalNonNegativeNumberValidator()]);

            if (op === 'out') {
                unitCostCtrl.setValue(null, { emitEvent: false });
            }
        }

        amountCtrl.updateValueAndValidity({ emitEvent: false });
        unitCostCtrl.updateValueAndValidity({ emitEvent: false });
        minCtrl.updateValueAndValidity({ emitEvent: false });
        syncStockBatchGroup(this.stockOperationForm.controls.batch, {
            active: op === 'in',
            required: this.product()?.requiresLotAndExpiry === true
        });
    }

    private resetStockOperationForm(operationType: StockOperationKind): void {
        this.stockOperationForm.reset({ clinicStockRowId: null, operationType, amount: null, unitCost: null, notes: '', minimumStockLevel: null }, { emitEvent: false });
    }

    /** Klinik seçilmeden miktar/maliyet/minimum alanları doğrulanmaz. */
    private clearQuantityValidators(): void {
        const { amount, unitCost, minimumStockLevel } = this.stockOperationForm.controls;

        for (const ctrl of [amount, unitCost, minimumStockLevel]) {
            ctrl.clearValidators();
            ctrl.updateValueAndValidity({ emitEvent: false });
        }
    }

    /** Parti bloğu yalnız stok girişinde ve en az bir alan doluyken gönderilir. */
    private batchRequestFor(op: StockOperationKind): { batch?: NonNullable<ReturnType<typeof getStockBatchRequest>>; acknowledgeExpired?: true } {
        const group = this.stockOperationForm.controls.batch;
        const batch = op === 'in' ? getStockBatchRequest(group) : null;

        return batch ? { batch, ...getAcknowledgeExpiredRequest(group) } : {};
    }
}
