import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ProductKindApi } from '@/app/entities/inventory/models/product-api.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { PRODUCT_KIND_OPTIONS } from '@/app/entities/inventory/utils/product-classification.utils';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormFieldComponent } from '@/app/shared/forms/form-field/form-field.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';
import { DialogUnsavedChangesDirective } from '@/app/shared/ui/unsaved-changes/dialog-unsaved-changes.directive';
import type { InlineCreateConfig } from '@/app/shared/forms/inline-create/inline-create.directive';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';

/**
 * Stoktan düşen akışlarda (uygulama, aşı, hızlı satış) yerinde ürün eklenmez: yeni ürünün stoğu yoktur, kayıt "yetersiz stok"la düşer (O1).
 * Seçicinin boş durumu kullanıcıyı doğru ekrana yönlendirir.
 */
export const STOCKED_PRODUCT_INLINE_CREATE: InlineCreateConfig = {
    canCreate: false,
    unavailableReason: 'Burada yalnız stoktaki ürün seçilir. Yeni ürünü Mal kabul ekranında stoğa girin.'
};

export interface QuickProductCreated {
    readonly id: string;
    readonly name: string;
    readonly kind: ProductKindApi;
    readonly unit: string;
    readonly unitPrice: number;
}

/**
 * Seçiciden ayrılmadan ürün kartı (O1): yalnız zorunlu alanlar (ad, tür, birim, satış fiyatı).
 * Ayrıntılar (kategori, barkod, KDV…) sonra ürün kartından tamamlanır. `kinds` çağıran akışın kabul ettiği türlerdir
 * (ör. aşı formunda yalnız Aşı; stok akışlarında Hizmet yok).
 */
@Component({
    selector: 'app-quick-product-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        FormFieldComponent,
        FormSubmitDirective,
        FormErrorSummaryComponent,
        DialogFocusReturnDirective,
        DialogUnsavedChangesDirective,
        ReadOnlyReasonDirective
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog header="Yeni ürün" [modal]="true" [dismissableMask]="true" [appUnsavedChanges]="form.dirty" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible" (onShow)="onShow()">
            <form appFormSubmit id="quick-product-form" [formGroup]="form" (ngSubmit)="onSubmit()">
                <app-form-error-summary />
                <div class="grid grid-cols-12 gap-4">
                    <app-form-field class="col-span-12" label="Ad" fieldId="qp-name" [error]="message('name')">
                        <input id="qp-name" pInputText class="w-full" formControlName="name" autocomplete="off" />
                    </app-form-field>
                    @if (kindOptions().length > 1) {
                        <app-form-field class="col-span-12 md:col-span-6" label="Tür" fieldId="qp-kind">
                            <p-select inputId="qp-kind" formControlName="kind" [options]="kindOptions()" optionLabel="label" optionValue="value" class="w-full" appendTo="body" />
                        </app-form-field>
                    }
                    <app-form-field class="col-span-12 md:col-span-6" label="Birim" fieldId="qp-unit" [error]="message('unit')">
                        <input id="qp-unit" pInputText class="w-full" formControlName="unit" placeholder="örn. Adet, Kutu" />
                    </app-form-field>
                    <app-form-field class="col-span-12 md:col-span-6" label="Satış fiyatı (₺)" fieldId="qp-price" [error]="message('unitPrice')">
                        <p-inputnumber inputId="qp-price" formControlName="unitPrice" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="2" [min]="0" locale="tr-TR" class="w-full" [fluid]="true" />
                    </app-form-field>
                </div>
                <p class="text-sm text-muted-color mt-3 mb-0">Kategori, barkod ve KDV gibi ayrıntıları sonra ürün kartından ekleyebilirsiniz.</p>
                @if (submitError()) {
                    <p class="text-danger mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                <button pButton type="submit" form="quick-product-form" data-testid="quick-product-save" [disabled]="submitting() || ro.mutationBlocked()" appReadOnlyReason><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
            </ng-template>
        </p-dialog>
    `
})
export class QuickProductDialogComponent {
    readonly visible = model(false);
    /** Seçicide yazılan ad; aynı bilgi ikinci kez yazılmaz. */
    readonly initialName = input('');
    readonly kinds = input<readonly ProductKindApi[]>(['Other', 'Medicine', 'Vaccine']);
    readonly productCreated = output<QuickProductCreated>();

    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly productService = inject(ProductService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly kindOptions = computed(() => PRODUCT_KIND_OPTIONS.filter((o) => this.kinds().includes(o.value)));

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        kind: ['Other' as ProductKindApi],
        unit: ['Adet', [Validators.required, Validators.maxLength(64)]],
        unitPrice: [null as number | null, [Validators.required, Validators.min(0)]]
    });

    onShow(): void {
        this.submitError.set(null);
        this.form.reset({ name: this.initialName().trim(), kind: this.kinds()[0] ?? 'Other', unit: 'Adet', unitPrice: null });
        // Seçiciden taşınan ad kullanıcı girdisidir; dolu diyalog sorusuz kapanmasın.
        if (this.form.controls.name.value) {
            this.form.controls.name.markAsDirty();
        }
    }

    message(field: 'name' | 'unit' | 'unitPrice'): string | null {
        const control = this.form.controls[field];

        if (!control.invalid || !control.touched) {
            return null;
        }

        if (control.hasError('required')) {
            return field === 'name' ? 'Ürün adını yazın.' : field === 'unit' ? 'Birimi yazın (örn. Adet).' : 'Satış fiyatını yazın; ücretsizse 0.';
        }

        return field === 'unitPrice' ? 'Fiyat 0 ya da daha büyük olmalı.' : 'Metin çok uzun.';
    }

    onSubmit(): void {
        if (this.form.invalid || this.submitting() || this.ro.mutationBlocked()) {
            return;
        }

        const v = this.form.getRawValue();
        const name = v.name.trim();
        const unit = v.unit.trim();
        const unitPrice = v.unitPrice ?? 0;

        this.submitting.set(true);
        this.submitError.set(null);
        this.productService
            .createFromFormValue({
                name,
                productCategoryId: '',
                sku: '',
                barcode: '',
                unit,
                unitPrice,
                currency: 'TRY',
                description: '',
                kind: v.kind,
                controlledClass: 'None',
                pharmacologicalForm: '',
                presentationForm: '',
                packaging: '',
                manufacturer: '',
                vatRate: null,
                purchasePrice: null
            })
            .subscribe({
                next: (id) => {
                    this.submitting.set(false);

                    if (!id) {
                        this.submitError.set('Ürün oluşturuldu ama seçilemedi; listeden seçin.');

                        return;
                    }

                    this.form.markAsPristine();
                    this.productCreated.emit({ id, name, kind: v.kind, unit, unitPrice });
                    this.visible.set(false);
                },
                error: (e: unknown) => {
                    this.submitting.set(false);
                    this.submitError.set(e instanceof Error ? e.message : 'Ürün oluşturulamadı.');
                }
            });
    }
}
