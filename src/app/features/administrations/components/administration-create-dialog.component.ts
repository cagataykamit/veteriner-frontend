import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, merge, of, startWith, switchMap, tap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { suggestAdministrationBatch } from '@/app/features/administrations/utils/administration-batch.utils';
import type { ProductStockBatchesVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import type { AdministrationCreateResultVm } from '@/app/features/administrations/models/administration-vm.model';
import {
    CHARGE_QUANTITY_MAX,
    CHARGE_QUANTITY_MAX_DECIMALS,
    chargeNumberValidator
} from '@/app/features/charges/utils/charge-amount.utils';
import type { ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
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
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule, DateInputComponent],
    template: `
        <p-dialog
            [header]="lateEntry() ? 'Uygulama kaydet (sonradan ekleme)' : 'Uygulama kaydet'"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(560px, 95vw)' }"
            [(visible)]="visible"
        >
            @if (petName()) {
                <p class="mt-0 mb-1 font-medium">{{ petName() }}</p>
            }
            <p class="mt-0 mb-4 text-sm text-muted-color">
                Klinikte hastaya uygulanan ürün kaydedilir ve stoktan düşülür. Dışarıdan alınacak ilaç için reçete yazın; reçete stok düşmez.
            </p>
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
                            styleClass="w-full"
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
                            Miktar *@if (unit()) { <span> ({{ unit() }})</span> }
                        </label>
                        <input id="ad-quantity" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="quantity" />
                        @if (form.controls.quantity.invalid && form.controls.quantity.dirty) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                        } @else if (unit()) {
                            <small class="text-muted-color">Miktar ürünün stok birimindedir: {{ unit() }}. Örnek: birim "şişe" ise 0,5 yarım şişedir.</small>
                        }
                    </div>
                    @if (form.controls.productId.value) {
                        <div class="col-span-12" data-testid="administration-batch">
                            <label for="ad-batch" class="block text-sm font-medium text-muted-color mb-2">Parti (seri no / SKT)</label>
                            @if (batchesLoading()) {
                                <small class="text-muted-color" role="status">Parti bilgisi yükleniyor…</small>
                            } @else if (batchesError()) {
                                <small class="text-muted-color block" role="status">
                                    {{ batchesError() }} Uygulama, SKT'si en yakın uygun partiden otomatik düşülür.
                                </small>
                            } @else if (batchInfo(); as info) {
                                @if (info.batches.length > 0) {
                                    <p-select
                                        inputId="ad-batch"
                                        formControlName="batchId"
                                        [options]="batchOptions()"
                                        optionLabel="label"
                                        optionValue="value"
                                        optionDisabled="disabled"
                                        appendTo="body"
                                        styleClass="w-full"
                                    />
                                } @else {
                                    <small class="text-muted-color block">Bu üründe partili stok yok.</small>
                                }
                                @if (batchGuide(); as guide) {
                                    <small class="block mt-1" [class.text-muted-color]="!guide.warn" [class.text-red-500]="guide.warn" role="status" data-testid="administration-batch-guide">{{ guide.text }}</small>
                                }
                            }
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
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button type="button" label="Kaydet ve stoktan düş" icon="pi pi-check" [loading]="submitting()" [disabled]="form.invalid || submitting()" (onClick)="onSubmit()" />
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
    private readonly stockBatchService = inject(StockBatchService);
    private readonly auth = inject(AuthService);

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

    readonly batchInfo = signal<ProductStockBatchesVm | null>(null);
    readonly batchesLoading = signal(false);
    readonly batchesError = signal<string | null>(null);

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

    readonly productOptions = computed(() =>
        this.products().map((p) => ({ value: p.id, label: p.sku && p.sku !== '—' ? `${p.name} (${p.sku})` : p.name }))
    );
    readonly unit = computed(() => {
        this.formValue();
        const id = this.form.controls.productId.value;
        return this.products().find((p) => p.id === id)?.unit ?? '';
    });

    readonly batchOptions = computed(() => {
        const unit = this.batchInfo()?.unit ?? '';
        return [
            { value: '', label: "Otomatik — SKT'si en yakın uygun parti", disabled: false },
            ...(this.batchInfo()?.batches ?? []).map((b) => ({
                value: b.id,
                label: `${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${unit}${b.isExpired ? ' · süresi geçmiş' : ''}`.trim(),
                disabled: b.isExpired
            }))
        ];
    });

    /** Seçili partinin kalanı/SKT'si veya "otomatik"te sunucunun seçeceği partinin önerisi. */
    readonly batchGuide = computed<{ text: string; warn: boolean } | null>(() => {
        this.formValue();
        const info = this.batchInfo();
        if (!info) {
            return null;
        }
        const quantity = this.form.controls.quantity.value;
        const batchId = this.form.controls.batchId.value;
        const unit = info.unit;
        if (batchId) {
            const b = info.batches.find((x) => x.id === batchId);
            if (!b) {
                return null;
            }
            const text = `Seçilen parti: ${b.lotNumber} · SKT ${b.expiryText} · kalan ${b.remainingText} ${unit}.`;
            return quantity != null && quantity > b.remainingQuantity
                ? { text: `${text} Miktar bu partinin kalanından fazla; bir uygulama iki partiye bölünmez.`, warn: true }
                : { text, warn: false };
        }
        const s = suggestAdministrationBatch(info, quantity);
        switch (s?.kind) {
            case 'batch':
                return { text: `Önerilen parti: ${s.batch.lotNumber} · SKT ${s.batch.expiryText} · kalan ${s.batch.remainingText} ${unit}.`, warn: false };
            case 'unbatched':
                return { text: 'Yeterli parti yok; partisiz (devir) bakiyeden düşülecek, kayıtta seri no ve SKT olmayacak.', warn: false };
            case 'expiredOnly':
                return { text: 'Yeterli stok yalnız süresi geçmiş partide; süresi geçmiş partiyle uygulama kaydedilemez.', warn: true };
            case 'insufficient':
                return { text: 'Hiçbir parti bu miktarı tek başına karşılamıyor; miktarı azaltıp ayrı kayıt girin.', warn: true };
            default:
                return null;
        }
    });

    constructor() {
        // Sunucudan dönen hata (ör. yetersiz stok) ürün, parti veya miktar değişince eskimiş olur.
        merge(this.form.controls.productId.valueChanges, this.form.controls.batchId.valueChanges, this.form.controls.quantity.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.submitError.set(null));
        this.form.controls.productId.valueChanges
            .pipe(
                tap(() => {
                    this.form.controls.batchId.setValue('', { emitEvent: false });
                    this.batchInfo.set(null);
                    this.batchesError.set(null);
                }),
                switchMap((productId) => this.loadBatches(productId)),
                takeUntilDestroyed()
            )
            .subscribe((info) => {
                this.batchInfo.set(info);
                this.batchesLoading.set(false);
            });
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

    /** Ürünün aktif kliniktaki parti bakiyesi; okunamazsa (ör. stok okuma yetkisi yok) otomatik FEFO'ya düşülür. */
    private loadBatches(productId: string) {
        const clinicId = this.auth.getClinicId()?.trim();
        if (!productId || !clinicId) {
            this.batchesLoading.set(false);
            return of(null);
        }
        this.batchesLoading.set(true);
        return this.stockBatchService.getByProduct(productId, clinicId).pipe(
            catchError((e: Error) => {
                this.batchesError.set(e.message || 'Parti bilgisi yüklenemedi.');
                return of(null);
            })
        );
    }

    private loadProducts(): void {
        if (this.productsLoaded || this.loadingProducts()) {
            return;
        }
        this.loadingProducts.set(true);
        this.productsError.set(null);
        this.productService.getProducts({ page: 1, pageSize: 200, isActive: true }).subscribe({
            next: (r) => {
                this.products.set(r.items);
                this.productsLoaded = true;
                this.loadingProducts.set(false);
            },
            error: (e: Error) => {
                this.productsError.set(e.message ?? 'Ürün listesi yüklenemedi.');
                this.loadingProducts.set(false);
            }
        });
    }
}
