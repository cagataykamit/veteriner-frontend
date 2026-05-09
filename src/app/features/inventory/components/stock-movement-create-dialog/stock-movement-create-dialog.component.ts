import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { mapStockMovementUpsertFormValueToCreateRequest } from '@/app/features/inventory/data/stock-movement.mapper';
import {
    createStockMovementFormGroup,
    getStockMovementFormValue,
    STOCK_MOVEMENT_CREATE_MOVEMENT_OPTIONS
} from '@/app/features/inventory/forms/stock-movement-form.factory';
import type { StockMovementFormMovementType } from '@/app/features/inventory/models/stock-movement-form.model';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';

type SelectOption = { label: string; value: string };

@Component({
    selector: 'app-stock-movement-create-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule],
    template: `
        <p-dialog
            header="Stok hareketi ekle"
            [modal]="true"
            [visible]="visible()"
            (visibleChange)="onVisibleChange($event)"
            [style]="{ width: 'min(32rem, 95vw)' }"
            [draggable]="false"
            [closable]="!submitting()"
        >
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; stok hareketi oluşturulamaz.
                </p>
            }

            @if (fixedProductId()?.trim()) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    {{ fixedProductLabel()?.trim() || 'Seçili ürün' }}
                </p>
            }

            @if (clinicsLoadError()) {
                <p class="text-muted-color text-sm mt-0 mb-4" role="status">{{ clinicsLoadError() }}</p>
            }

            @if (productsLoadError()) {
                <p class="text-muted-color text-sm mt-0 mb-4" role="alert">{{ productsLoadError() }}</p>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
                <div>
                    <label for="smcClinic" class="block text-sm font-medium text-muted-color mb-2">Klinik *</label>
                    <p-select
                        inputId="smcClinic"
                        formControlName="clinicId"
                        [options]="clinicOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Klinik seçin"
                        [filter]="clinicOptions().length > 8"
                        filterBy="label"
                        [showClear]="true"
                        styleClass="w-full"
                        [loading]="clinicsLoading()"
                    />
                    @if (form.controls.clinicId.invalid && form.controls.clinicId.touched) {
                        <small class="text-red-500">Klinik seçimi zorunludur.</small>
                    }
                </div>

                @if (!fixedProductId()?.trim()) {
                    <div>
                        <label for="smcProduct" class="block text-sm font-medium text-muted-color mb-2">Ürün *</label>
                        <p-select
                            inputId="smcProduct"
                            formControlName="productId"
                            [options]="productOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Ürün seçin"
                            [filter]="true"
                            filterBy="label"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="productsLoading()"
                        />
                        @if (form.controls.productId.invalid && form.controls.productId.touched) {
                            <small class="text-red-500">Ürün seçimi zorunludur.</small>
                        }
                    </div>
                }

                <div>
                    <label for="smcMovementType" class="block text-sm font-medium text-muted-color mb-2">Hareket tipi *</label>
                    <p-select
                        inputId="smcMovementType"
                        formControlName="movementType"
                        [options]="movementTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        styleClass="w-full"
                    />
                    @if (movementHint()) {
                        <p class="text-xs text-muted-color mt-2 mb-0">{{ movementHint() }}</p>
                    }
                </div>

                <div>
                    <label for="smcQty" class="block text-sm font-medium text-muted-color mb-2">Miktar *</label>
                    <input
                        id="smcQty"
                        type="number"
                        step="any"
                        class="w-full p-inputtext p-component"
                        formControlName="quantity"
                    />
                    @if (form.controls.quantity.invalid && form.controls.quantity.touched) {
                        @if (form.controls.quantity.errors?.['required']) {
                            <small class="text-red-500">Miktar zorunludur.</small>
                        } @else if (form.controls.quantity.errors?.['min']) {
                            <small class="text-red-500">Düzeltmede miktar 0 veya üzeri olmalıdır.</small>
                        } @else if (form.controls.quantity.errors?.['minExclusive']) {
                            <small class="text-red-500">Bu hareket tipinde miktar 0’dan büyük olmalıdır.</small>
                        }
                    }
                </div>

                <div>
                    <label for="smcUnitCost" class="block text-sm font-medium text-muted-color mb-2">Birim maliyet</label>
                    <input
                        id="smcUnitCost"
                        type="number"
                        step="0.01"
                        min="0"
                        class="w-full p-inputtext p-component"
                        formControlName="unitCost"
                    />
                    @if (form.controls.unitCost.invalid && form.controls.unitCost.touched) {
                        <small class="text-red-500">0 veya üzeri geçerli bir değer girin.</small>
                    }
                </div>

                <div>
                    <label for="smcReason" class="block text-sm font-medium text-muted-color mb-2">Neden</label>
                    <input id="smcReason" type="text" class="w-full p-inputtext p-component" formControlName="reason" autocomplete="off" />
                </div>

                <div>
                    <label for="smcOccurred" class="block text-sm font-medium text-muted-color mb-2">İşlem zamanı</label>
                    <input id="smcOccurred" type="datetime-local" class="w-full p-inputtext p-component" formControlName="occurredAtUtcLocal" />
                    <p class="text-xs text-muted-color mt-1 mb-0">Boş bırakılırsa sunucu varsayılanını kullanır.</p>
                </div>

                <div>
                    <label for="smcNotes" class="block text-sm font-medium text-muted-color mb-2">Not</label>
                    <textarea id="smcNotes" rows="2" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 text-sm m-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap justify-end gap-2 mt-2">
                    <p-button
                        type="button"
                        label="İptal"
                        severity="secondary"
                        [disabled]="submitting()"
                        (onClick)="onCancel()"
                    />
                    <p-button
                        type="submit"
                        label="Kaydet"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="submitDisabled()"
                    />
                </div>
            </form>
        </p-dialog>
    `
})
export class StockMovementCreateDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly clinics = inject(ClinicsService);
    private readonly productService = inject(ProductService);
    private readonly stockMovementService = inject(StockMovementService);
    private readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly visible = input(false);
    readonly visibleChange = output<boolean>();
    readonly fixedProductId = input<string | null>(null);
    readonly fixedProductLabel = input<string | null>(null);
    readonly defaultClinicId = input<string | null>(null);
    readonly created = output<void>();

    readonly form = createStockMovementFormGroup(this.fb);

    readonly movementTypeOptions = [...STOCK_MOVEMENT_CREATE_MOVEMENT_OPTIONS];

    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly productOptions = signal<SelectOption[]>([]);

    readonly clinicsLoading = signal(false);
    readonly productsLoading = signal(false);
    readonly clinicsLoadError = signal<string | null>(null);
    readonly productsLoadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    movementHint(): string {
        const t = this.form.controls.movementType.value as StockMovementFormMovementType;
        return STOCK_MOVEMENT_CREATE_MOVEMENT_OPTIONS.find((o) => o.value === t)?.hint ?? '';
    }

    constructor() {
        this.form.controls.movementType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.form.controls.quantity.updateValueAndValidity({ emitEvent: false });
        });

        effect(() => {
            if (!this.visible()) {
                return;
            }
            untracked(() => this.prepareOpen());
        });
    }

    onVisibleChange(next: boolean): void {
        this.visibleChange.emit(next);
        if (!next) {
            this.submitError.set(null);
        }
    }

    onCancel(): void {
        if (!this.submitting()) {
            this.visibleChange.emit(false);
        }
    }

    submitDisabled(): boolean {
        if (this.ro.mutationBlocked() || this.submitting()) {
            return true;
        }
        if (!this.fixedProductId()?.trim() && !this.productsLoading() && this.productOptions().length === 0) {
            return true;
        }
        return this.form.invalid || !this.form.controls.clinicId.value?.trim();
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        if (!this.form.controls.clinicId.value?.trim()) {
            this.submitError.set('Stok hareketi için klinik seçimi gerekli.');
            this.form.controls.clinicId.markAsTouched();
            return;
        }
        this.form.markAllAsTouched();
        if (this.form.invalid || this.submitting()) {
            return;
        }
        let body;
        try {
            body = mapStockMovementUpsertFormValueToCreateRequest(getStockMovementFormValue(this.form));
        } catch {
            this.submitError.set('Form doğrulanamadı.');
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        this.stockMovementService.create(body).subscribe({
            next: () => {
                this.submitting.set(false);
                this.created.emit();
                this.visibleChange.emit(false);
            },
            error: (e: Error) => {
                this.submitting.set(false);
                this.submitError.set(e.message ?? 'Kayıt başarısız.');
            }
        });
    }

    private prepareOpen(): void {
        this.submitError.set(null);
        this.submitting.set(false);
        this.clinicsLoadError.set(null);
        this.productsLoadError.set(null);

        this.form.reset({
            clinicId: '',
            productId: '',
            movementType: 'In',
            quantity: null,
            unitCost: null,
            reason: '',
            occurredAtUtcLocal: '',
            notes: ''
        });

        const fixedPid = this.fixedProductId()?.trim() ?? '';
        if (fixedPid) {
            this.form.patchValue({ productId: fixedPid });
            this.form.controls.productId.disable({ emitEvent: false });
            this.productOptions.set([]);
        } else {
            this.form.controls.productId.enable({ emitEvent: false });
            this.loadProducts();
        }

        const preferredClinic =
            this.defaultClinicId()?.trim() ?? this.auth.getClinicId()?.trim() ?? '';
        this.loadClinics(preferredClinic);
    }

    private loadClinics(preferredClinicId: string): void {
        this.clinicsLoading.set(true);
        this.clinics.listClinics().subscribe({
            next: (rows) => {
                this.clinicsLoading.set(false);
                const active = rows.filter((c) => c.isActive !== false);
                const opts: SelectOption[] = active.map((c) => ({
                    label: c.name.trim() ? c.name : c.id,
                    value: c.id
                }));
                this.clinicOptions.set(opts);
                let cid = preferredClinicId.trim();
                if (!cid && opts.length === 1) {
                    cid = opts[0].value;
                }
                if (cid && !opts.some((o) => o.value === cid)) {
                    const nm = this.auth.getClinicName()?.trim();
                    opts.unshift({
                        label: nm ? `${nm}` : `Klinik (${cid.slice(0, 8)}…)`,
                        value: cid
                    });
                    this.clinicOptions.set([...opts]);
                }
                this.form.patchValue({ clinicId: cid });
            },
            error: () => {
                this.clinicsLoading.set(false);
                this.clinicsLoadError.set('Klinik listesi yüklenemedi.');
                const fallbackId = preferredClinicId.trim() || this.auth.getClinicId()?.trim() || '';
                if (fallbackId) {
                    const nm = this.auth.getClinicName()?.trim();
                    this.clinicOptions.set([
                        {
                            label: nm ? `${nm}` : 'Aktif klinik',
                            value: fallbackId
                        }
                    ]);
                    this.form.patchValue({ clinicId: fallbackId });
                } else {
                    this.clinicOptions.set([]);
                    this.form.patchValue({ clinicId: '' });
                }
            }
        });
    }

    private loadProducts(): void {
        this.productsLoading.set(true);
        this.productService.getProducts({ page: 1, pageSize: 500, isActive: true }).subscribe({
            next: (r) => {
                this.productsLoading.set(false);
                const opts = (r.items ?? []).map((p) => ({
                    label: `${p.name} (${p.sku})`,
                    value: p.id
                }));
                this.productOptions.set(opts);
            },
            error: () => {
                this.productsLoading.set(false);
                this.productsLoadError.set('Ürünler yüklenemedi.');
                this.productOptions.set([]);
            }
        });
    }
}
