import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { ChargeSuggestionVm } from '@/app/entities/charge/models/charge-suggestion-vm.model';
import { CHARGE_DESCRIPTION_MAX_LENGTH, CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, CHARGE_UNIT_PRICE_MAX, CHARGE_UNIT_PRICE_MAX_DECIMALS, chargeNumberValidator, computeChargeAmount } from '@/app/entities/charge/utils/charge-amount.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Çevirmede kalemden farklı olan alanlar; değişmeyen alan gönderilmez (sunucu kalemdeki değeri kullanır). */
export interface ChargeSuggestionOverrides {
    description?: string;
    quantity?: number;
    unitPrice?: number;
}

/**
 * Kalemi düzenleyerek ücrete çevirir (`Charges.Create`): açıklama, miktar, birim fiyat. Katalog fiyatı olmayan kalemde birim fiyat boş ve zorunludur.
 * Çağrıyı `execute` yapar; başarıda `converted`, hatada Türkçe mesaj diyalogda kalır. Yetki denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-charge-suggestion-convert-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog header="Ücrete çevir" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(560px, 95vw)' }" [(visible)]="visible">
            @if (suggestion(); as s) {
                <p class="mt-0 mb-1 font-medium">{{ s.clientName }} · {{ s.petName }}</p>
                @if (s.suggestedUnitPrice === null) {
                    <p class="mt-0 mb-4 text-sm text-muted-color">Katalogda bu kalem için fiyat yok; birim fiyatı girin.</p>
                }
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12">
                        <label for="csc-description" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                        <input id="csc-description" type="text" class="w-full p-inputtext p-component" formControlName="description" [attr.maxlength]="descriptionMaxLength" />
                        @if (form.controls.description.invalid && form.controls.description.touched) {
                            <small class="text-red-500">Açıklama zorunludur (en fazla {{ descriptionMaxLength }} karakter).</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <label for="csc-quantity" class="block text-sm font-medium text-muted-color mb-2">Miktar *</label>
                        <input id="csc-quantity" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="quantity" />
                        @if (form.controls.quantity.invalid && form.controls.quantity.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <label for="csc-unit-price" class="block text-sm font-medium text-muted-color mb-2">Birim fiyat (TRY) *</label>
                        <input id="csc-unit-price" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                        @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ unitPriceDecimals }} ondalıklı ve {{ unitPriceMax }} üstünde olmayan bir fiyat girin.</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <span class="block text-sm font-medium text-muted-color mb-2">Tutar</span>
                        <div class="p-inputtext p-component w-full font-semibold" aria-live="polite">{{ amountDisplay() }}</div>
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="close()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="form.invalid || submitting()" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Ücrete çevir</button>
            </ng-template>
        </p-dialog>
    `
})
export class ChargeSuggestionConvertDialogComponent {
    readonly visible = model(false);
    readonly suggestion = input<ChargeSuggestionVm | null>(null);
    /** Düzenlenen alanlarla çağrıyı yapar; her seferinde güncel kalem için çağıran bileşen bağlar. */
    readonly execute = input.required<(overrides: ChargeSuggestionOverrides) => Observable<unknown>>();
    readonly converted = output<void>();

    private readonly fb = inject(FormBuilder);

    protected readonly descriptionMaxLength = CHARGE_DESCRIPTION_MAX_LENGTH;
    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;
    protected readonly unitPriceMax = CHARGE_UNIT_PRICE_MAX;
    protected readonly unitPriceDecimals = CHARGE_UNIT_PRICE_MAX_DECIMALS;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly form = this.fb.group({
        description: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CHARGE_DESCRIPTION_MAX_LENGTH)]),
        quantity: this.fb.control<number | null>(null, [Validators.required, chargeNumberValidator(CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS)]),
        unitPrice: this.fb.control<number | null>(null, [Validators.required, chargeNumberValidator(CHARGE_UNIT_PRICE_MAX, CHARGE_UNIT_PRICE_MAX_DECIMALS)])
    });

    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

    protected readonly amountDisplay = computed(() => {
        this.formValue();
        const { quantity, unitPrice } = this.form.getRawValue();
        const amount = computeChargeAmount(quantity, unitPrice);

        return amount === null ? '—' : formatMoney(amount, this.suggestion()?.currency || 'TRY');
    });

    constructor() {
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.submitError.set(null));
        effect(() => {
            const s = this.suggestion();

            if (this.visible() && s) {
                untracked(() => {
                    this.submitError.set(null);
                    this.form.reset({ description: s.description, quantity: s.quantity, unitPrice: s.suggestedUnitPrice });
                });
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        const s = this.suggestion();

        if (this.submitting() || !s) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const { description, quantity, unitPrice } = this.form.getRawValue();
        const overrides: ChargeSuggestionOverrides = {
            ...(description.trim() !== s.description.trim() ? { description: description.trim() } : {}),
            ...(quantity !== s.quantity ? { quantity: quantity! } : {}),
            ...(unitPrice !== s.suggestedUnitPrice ? { unitPrice: unitPrice! } : {})
        };

        this.submitError.set(null);
        this.submitting.set(true);
        this.execute()(overrides).subscribe({
            next: () => {
                this.submitting.set(false);
                this.visible.set(false);
                this.converted.emit();
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Ücrete çevrilemedi.'));
            }
        });
    }
}
