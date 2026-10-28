import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { AdministrationBatchFieldComponent } from '@/app/entities/administration/components/administration-batch-field.component';
import { createAdministrationBatchPicker } from '@/app/entities/administration/utils/administration-batch-picker';
import { AdministrationsService } from '@/app/entities/administration/services/administrations.service';
import type { AdministrationCreateResultVm } from '@/app/entities/administration/models/administration-vm.model';
import { CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, chargeNumberValidator } from '@/app/entities/charge/utils/charge-amount.utils';
import type { ProductListItemVm } from '@/app/entities/inventory/models/product-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { dateTimeYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';

const NOTES_MAX_LENGTH = 2000;

/**
 * Hastaya uygulanan ürünün kaydı (`Administrations.Create`): stok aynı işlemde düşer, yetersiz stok kaydı engeller.
 * Miktar ürünün stok birimindedir (birim dönüşümü yok). Yetki denetimi çağıran bileşende yapılır.
 * `lateEntry` (bağlı muayene kesinleşmiş, ADR-013): gerekçe zorunlu alanı görünür ve `lateEntryReason` olarak gider; taslakta gerekçe sorulmaz.
 */
@Component({
    selector: 'app-administration-create-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule, DateInputComponent, AdministrationBatchFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="lateEntry() ? 'Uygulama kaydet (sonradan ekleme)' : 'Uygulama kaydet'" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(560px, 95vw)' }" [(visible)]="visible">
            @if (petName()) {
                <p class="mt-0 mb-1 font-medium">{{ petName() }}</p>
            }
            <p class="mt-0 mb-4 text-sm text-muted-color">Klinikte hastaya uygulanan ürün kaydedilir ve stoktan düşülür. Dışarıdan alınacak ilaç için reçete yazın; reçete stok düşmez.</p>
            @if (lateEntry()) {
                <p class="mt-0 mb-4 text-sm" role="note" data-testid="late-entry-note">
                    Bu muayene kesinleşmiş. Uygulama, <strong>"Kesinleştirmeden sonra eklendi"</strong> işaretiyle ve gerekçenizle ayrı kayıt olarak eklenir; muayenenin kendisi değişmez.
                </p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12">
                        <label for="ad-product" class="block text-sm font-medium text-muted-color mb-2">Ürün *</label>
                        <p-select
                            inputId="ad-product"
                            formControlName="productId"
                            [options]="productOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Ürün seçin"
                            [filter]="true"
                            filterPlaceholder="Ara…"
                            filterBy="label"
                            [loading]="loadingProducts()"
                            appendTo="body"
                            class="w-full"
                        />
                        @if (form.controls.productId.invalid && form.controls.productId.touched) {
                            <small class="text-red-500">Ürün seçimi zorunludur.</small>
                        }
                        @if (productsError()) {
                            <small class="text-red-500 block">{{ productsError() }}</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-6">
                        <label for="ad-quantity" class="block text-sm font-medium text-muted-color mb-2">
                            Miktar *
                            @if (unit()) {
                                <span> ({{ unit() }})</span>
                            }
                        </label>
                        <input id="ad-quantity" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="quantity" />
                        @if (form.controls.quantity.invalid && form.controls.quantity.dirty) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                        } @else if (unit()) {
                            <small class="text-muted-color">Miktar ürünün stok birimindedir: {{ unit() }}. Örnek: birim "şişe" ise 0,5 yarım şişedir.</small>
                        }
                    </div>
                    @if (form.controls.productId.value) {
                        <div class="col-span-12">
                            <app-administration-batch-field [picker]="batchPicker" [batchControl]="form.controls.batchId" />
                        </div>
                    }
                    <div class="col-span-12 sm:col-span-6">
                        <label for="ad-at" class="block text-sm font-medium text-muted-color mb-2">Uygulama zamanı</label>
                        <app-date-input inputId="ad-at" type="datetime-local" formControlName="administeredAtLocal" />
                        @if (form.controls.administeredAtLocal.hasError('dateYearInvalid') && form.controls.administeredAtLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else {
                            <small class="text-muted-color">Boş bırakılırsa şimdi kaydedilir (en fazla 7 gün geriye).</small>
                        }
                    </div>
                    @if (lateEntry()) {
                        <div class="col-span-12">
                            <label for="ad-late-reason" class="block text-sm font-medium text-muted-color mb-2">Sonradan ekleme gerekçesi *</label>
                            <textarea id="ad-late-reason" rows="2" class="w-full p-inputtext p-component" formControlName="lateEntryReason" data-testid="late-entry-reason"></textarea>
                            @if (form.controls.lateEntryReason.invalid && form.controls.lateEntryReason.touched) {
                                <small class="text-red-500">Gerekçe {{ reasonMin }}–{{ reasonMax }} karakter olmalıdır.</small>
                            }
                        </div>
                    }
                    <div class="col-span-12">
                        <label for="ad-notes" class="block text-sm font-medium text-muted-color mb-2">Not</label>
                        <textarea id="ad-notes" rows="2" class="w-full p-inputtext p-component" formControlName="notes" [attr.maxlength]="notesMaxLength"></textarea>
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="close()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="form.invalid || submitting()" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet ve stoktan düş</button>
            </ng-template>
        </p-dialog>
    `
})
export class AdministrationCreateDialogComponent {
    readonly visible = model(false);
    readonly petId = input.required<string>();
    readonly petName = input<string | null>(null);
    readonly examinationId = input<string | null>(null);
    readonly treatmentId = input<string | null>(null);
    /** Bağlı muayene kesinleşmişse sonradan ekleme: gerekçe zorunlu. */
    readonly lateEntry = input(false);
    readonly saved = output<AdministrationCreateResultVm>();

    private readonly fb = inject(FormBuilder);
    private readonly administrationsService = inject(AdministrationsService);
    private readonly productService = inject(ProductService);

    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;
    protected readonly notesMaxLength = NOTES_MAX_LENGTH;
    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly loadingProducts = signal(false);
    readonly productsError = signal<string | null>(null);
    private readonly products = signal<ProductListItemVm[]>([]);
    private productsLoaded = false;

    /** Form başına bir kez üretilir; hata sonrası yeniden denemede aynı kalır (ikinci düşüm oluşmaz), başarıdan sonra yenilenir. */
    private requestId = crypto.randomUUID();

    readonly form = this.fb.group({
        productId: this.fb.nonNullable.control('', Validators.required),
        /** Boş = otomatik (sunucu FEFO ile seçer). */
        batchId: this.fb.nonNullable.control(''),
        quantity: this.fb.control<number | null>(null, [Validators.required, chargeNumberValidator(CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS)]),
        administeredAtLocal: this.fb.nonNullable.control('', dateTimeYearRangeValidator()),
        notes: this.fb.nonNullable.control('', Validators.maxLength(NOTES_MAX_LENGTH)),
        lateEntryReason: this.fb.nonNullable.control('')
    });

    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

    readonly productOptions = computed(() => this.products().map((p) => ({ value: p.id, label: p.sku && p.sku !== '—' ? `${p.name} (${p.sku})` : p.name })));
    readonly unit = computed(() => {
        this.formValue();
        const id = this.form.controls.productId.value;

        return this.products().find((p) => p.id === id)?.unit ?? '';
    });

    readonly batchPicker = createAdministrationBatchPicker(this.form.controls);
    readonly batchInfo = this.batchPicker.info;
    readonly batchOptions = this.batchPicker.options;
    readonly batchGuide = this.batchPicker.guide;
    readonly batchesLoading = this.batchPicker.loading;
    readonly batchesError = this.batchPicker.error;

    constructor() {
        // Sunucudan dönen hata (ör. yetersiz stok) ürün, parti veya miktar değişince eskimiş olur.
        merge(this.form.controls.productId.valueChanges, this.form.controls.batchId.valueChanges, this.form.controls.quantity.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.submitError.set(null));
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.form.reset({ productId: '', batchId: '', quantity: null, administeredAtLocal: '', notes: '', lateEntryReason: '' });
                    this.form.controls.lateEntryReason.setValidators(this.lateEntry() ? reasonLength : null);
                    this.form.controls.lateEntryReason.updateValueAndValidity();
                    this.loadProducts();
                });
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        if (this.submitting()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const at = v.administeredAtLocal.trim();
        const administeredAtUtc = at ? fromIstanbulDateTimeLocalInputToUtcIso(at) : null;

        if (at && !administeredAtUtc) {
            this.submitError.set('Geçerli bir uygulama zamanı girin.');

            return;
        }

        this.submitError.set(null);
        this.submitting.set(true);
        this.administrationsService
            .createAdministration({
                petId: this.petId(),
                examinationId: this.examinationId(),
                treatmentId: this.treatmentId(),
                productId: v.productId,
                quantity: v.quantity!,
                administeredAtUtc,
                notes: v.notes,
                lateEntryReason: this.lateEntry() ? v.lateEntryReason : null,
                requestId: this.requestId,
                batchId: v.batchId || null
            })
            .subscribe({
                next: (result) => {
                    this.requestId = crypto.randomUUID();
                    this.submitting.set(false);
                    this.visible.set(false);
                    this.saved.emit(result);
                },
                error: (e: unknown) => {
                    this.submitting.set(false);
                    this.submitError.set(panelHttpFailureMessage(e, 'Uygulama kaydedilemedi.'));
                }
            });
    }

    private loadProducts(): void {
        if (this.productsLoaded || this.loadingProducts()) {
            return;
        }

        this.loadingProducts.set(true);
        this.productsError.set(null);
        this.productService.getProducts({ page: 1, pageSize: 200, isActive: true, stockTrackedOnly: true }).subscribe({
            next: (r) => {
                this.products.set(r.items);
                this.productsLoaded = true;
                this.loadingProducts.set(false);
            },
            error: (e: Error) => {
                this.productsError.set(panelHttpFailureMessage(e, 'Ürün listesi yüklenemedi.'));
                this.loadingProducts.set(false);
            }
        });
    }
}
