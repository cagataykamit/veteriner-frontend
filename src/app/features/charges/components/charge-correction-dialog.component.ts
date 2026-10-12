import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import {
    CHARGE_DESCRIPTION_MAX_LENGTH,
    CHARGE_QUANTITY_MAX,
    CHARGE_QUANTITY_MAX_DECIMALS,
    CHARGE_UNIT_PRICE_MAX,
    CHARGE_UNIT_PRICE_MAX_DECIMALS,
    chargeNumberValidator,
    computeChargeAmount
} from '@/app/features/charges/utils/charge-amount.utils';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Ücret düzeltmesi (`Charges.Correct`): açıklama, miktar, birim fiyat. Gerekçe zorunlu; yeni tutar tahsis edilen tutarın altına inemez (sunucu 409 verir).
 * Yetki denetimi çağıran bileşende yapılır; bu diyalog yalnızca yetkili kullanıcıya açılır.
 */
@Component({
    selector: 'app-charge-correction-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
    template: `
        <p-dialog
            header="Ücreti düzelt"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(560px, 95vw)' }"
            [(visible)]="visible"
        >
            @if (charge(); as c) {
                <p class="mt-0 mb-1 font-medium">{{ c.clientName }}</p>
                @if (c.allocatedAmount) {
                    <p class="mt-0 mb-4 text-sm text-muted-color">
                        Bu ücrete {{ money(c.allocatedAmount, c.currency) }} ödeme bağlı; yeni tutar bunun altına inemez.
                    </p>
                }
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12">
                        <label for="cc-description" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                        <input id="cc-description" type="text" class="w-full p-inputtext p-component" formControlName="description" [attr.maxlength]="descriptionMaxLength" />
                        @if (form.controls.description.invalid && form.controls.description.touched) {
                            <small class="text-red-500">Açıklama zorunludur (en fazla {{ descriptionMaxLength }} karakter).</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <label for="cc-quantity" class="block text-sm font-medium text-muted-color mb-2">Miktar *</label>
                        <input id="cc-quantity" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="quantity" />
                        @if (form.controls.quantity.invalid && form.controls.quantity.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <label for="cc-unit-price" class="block text-sm font-medium text-muted-color mb-2">Birim fiyat (TRY) *</label>
                        <input id="cc-unit-price" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                        @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ unitPriceDecimals }} ondalıklı ve {{ unitPriceMax }} üstünde olmayan bir fiyat girin.</small>
                        }
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <span class="block text-sm font-medium text-muted-color mb-2">Yeni tutar</span>
                        <div class="p-inputtext p-component w-full font-semibold" aria-live="polite">{{ amountDisplay() }}</div>
                    </div>
                    <div class="col-span-12">
                        <label for="cc-reason" class="block text-sm font-medium text-muted-color mb-2">Gerekçe *</label>
                        <textarea id="cc-reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                        @if (form.controls.reason.invalid && (form.controls.reason.dirty || form.controls.reason.touched)) {
                            <small class="text-red-500">Gerekçe {{ reasonMin }}–{{ reasonMax }} karakter olmalıdır.</small>
                        }
                    </div>
                </div>
                @if (unchanged()) {
                    <p class="text-sm text-muted-color mt-3 mb-0" role="note">Açıklama, miktar veya birim fiyattan en az biri değişmelidir.</p>
                }
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    label="Düzeltmeyi kaydet"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || unchanged() || submitting()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class ChargeCorrectionDialogComponent {
    readonly visible = model(false);
    /** Düzeltilecek ücret. */
    readonly charge = input<ChargeVm | null>(null);
    readonly corrected = output<ChargeVm>();

    private readonly fb = inject(FormBuilder);
    private readonly chargesService = inject(ChargesService);

    protected readonly descriptionMaxLength = CHARGE_DESCRIPTION_MAX_LENGTH;
    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;
    protected readonly unitPriceMax = CHARGE_UNIT_PRICE_MAX;
    protected readonly unitPriceDecimals = CHARGE_UNIT_PRICE_MAX_DECIMALS;
    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;
    protected readonly money = formatMoney;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly form = this.fb.group({
        description: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CHARGE_DESCRIPTION_MAX_LENGTH)]),
        quantity: this.fb.control<number | null>(null, [Validators.required, chargeNumberValidator(CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS)]),
        unitPrice: this.fb.control<number | null>(null, [Validators.required, chargeNumberValidator(CHARGE_UNIT_PRICE_MAX, CHARGE_UNIT_PRICE_MAX_DECIMALS)]),
        reason: this.fb.nonNullable.control('', reasonLength)
    });

    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

    protected readonly amountDisplay = computed(() => {
        this.formValue();
        const { quantity, unitPrice } = this.form.getRawValue();
        const amount = computeChargeAmount(quantity, unitPrice);
        return amount === null ? '—' : formatMoney(amount, this.charge()?.currency || 'TRY');
    });

    /** Sunucu "değişiklik yok"u 400 ile reddeder; istemci önceden engeller. */
    protected readonly unchanged = computed(() => {
        this.formValue();
        const c = this.charge();
        const { description, quantity, unitPrice } = this.form.getRawValue();
        return !!c && description.trim() === c.description.trim() && quantity === c.quantity && unitPrice === c.unitPrice;
    });

    constructor() {
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.submitError.set(null));
        effect(() => {
            const c = this.charge();
            if (this.visible() && c) {
                untracked(() => {
                    this.submitError.set(null);
                    this.form.reset({ description: c.description, quantity: c.quantity, unitPrice: c.unitPrice, reason: '' });
                });
            }
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        const c = this.charge();
        if (this.submitting() || !c) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (this.unchanged()) {
            return;
        }
        const { description, quantity, unitPrice, reason } = this.form.getRawValue();
        this.submitError.set(null);
        this.submitting.set(true);
        this.chargesService.correctCharge(c.id, { description, quantity: quantity!, unitPrice: unitPrice!, reason }).subscribe({
            next: (charge) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.corrected.emit(charge);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Ücret düzeltilemedi.'));
            }
        });
    }
}
