import { Component, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { DiscountCodeDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { SalesPartnersService } from '@/app/features/sales-partners/services/sales-partners.service';
import { normalizeDiscountCodeInput } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { fromIstanbulDateAndTimeToUtcIso, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** İstanbul gününün başlangıcı (UTC ISO); boş tarih `null`. */
function istanbulDayStartUtc(date: string): string | null {
    return date ? fromIstanbulDateAndTimeToUtcIso(date, '00:00') : null;
}

/**
 * Kod ekle/düzenle (ADR-037 madde 2): indirim ve komisyon yüzdesi kod başına zorunlu (varsayılan yok). Kod metni sonradan değişmez;
 * yüzde değişikliği yalnız yeni kullanımları etkiler. Geçerlilik tarihleri İstanbul günü; bitiş günü dahil değildir.
 */
@Component({
    selector: 'app-discount-code-form-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputNumberModule, InputTextModule, MessageModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="code() ? 'Kodu düzenle' : 'Yeni kod'" [modal]="true" [(visible)]="visible" [style]="{ width: 'min(32rem, 95vw)' }" [draggable]="false" [closable]="!submitting()">
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (error()) {
                    <p-message severity="error" class="w-full" role="alert">{{ error() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="dcCode" class="text-sm font-medium text-muted-color">Kod *</label>
                    <input id="dcCode" pInputText formControlName="code" class="uppercase" autocomplete="off" maxlength="32" (input)="normalizeCode()" />
                    <small class="text-muted-color">3–32 karakter; harf, rakam ve tire. Büyük/küçük harf ve Türkçe harf farkı yoktur.</small>
                    @if (code()) {
                        <small class="text-muted-color">Kod metni değiştirilemez; var olan kullanımlar eski yüzdelerle sürer.</small>
                    }
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="dcDiscount" class="text-sm font-medium text-muted-color">Müşteriye indirim (%) *</label>
                        <p-inputnumber inputId="dcDiscount" formControlName="discountPercent" [min]="0" [max]="99.99" [maxFractionDigits]="2" locale="tr-TR" [fluid]="true" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="dcCommission" class="text-sm font-medium text-muted-color">Ortağa komisyon (%) *</label>
                        <p-inputnumber inputId="dcCommission" formControlName="commissionPercent" [min]="0" [max]="100" [maxFractionDigits]="2" locale="tr-TR" [fluid]="true" />
                    </div>
                </div>
                @if ((form.controls.discountPercent.invalid || form.controls.commissionPercent.invalid) && form.touched) {
                    <small class="text-red-500">İndirim 0–99,99, komisyon 0–100 arasında girilmeli.</small>
                }
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="dcFrom" class="text-sm font-medium text-muted-color">Başlangıç</label>
                        <input id="dcFrom" pInputText type="date" formControlName="validFrom" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="dcUntil" class="text-sm font-medium text-muted-color">Bitiş (dahil değil)</label>
                        <input id="dcUntil" pInputText type="date" formControlName="validUntil" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="dcMax" class="text-sm font-medium text-muted-color">Kullanım limiti</label>
                        <p-inputnumber inputId="dcMax" formControlName="maxRedemptions" [min]="1" [useGrouping]="false" [fluid]="true" />
                    </div>
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>
    `
})
export class DiscountCodeFormDialogComponent {
    readonly visible = model(false);
    readonly partnerId = input.required<string>();
    /** Düzenlenen kod; `null` yeni kod. */
    readonly code = input<DiscountCodeDto | null>(null);
    readonly saved = output<DiscountCodeDto>();

    readonly copy = PANEL_COPY;
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);

    private readonly fb = inject(FormBuilder);
    private readonly partners = inject(SalesPartnersService);

    readonly form = this.fb.group({
        code: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Z0-9-]{3,32}$/)]),
        discountPercent: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(99.99)]),
        commissionPercent: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
        validFrom: this.fb.nonNullable.control(''),
        validUntil: this.fb.nonNullable.control(''),
        maxRedemptions: this.fb.control<number | null>(null, [Validators.min(1)])
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                const c = untracked(() => this.code());

                untracked(() => {
                    this.error.set(null);
                    this.form.reset({
                        code: c?.code ?? '',
                        discountPercent: c?.discountPercent ?? null,
                        commissionPercent: c?.commissionPercent ?? null,
                        validFrom: toIstanbulDateInputValue(c?.validFromUtc ?? null),
                        validUntil: toIstanbulDateInputValue(c?.validUntilUtc ?? null),
                        maxRedemptions: c?.maxRedemptions ?? null
                    });

                    if (c) {
                        this.form.controls.code.disable();
                    } else {
                        this.form.controls.code.enable();
                    }
                });
            }
        });
    }

    normalizeCode(): void {
        const control = this.form.controls.code;

        control.setValue(normalizeDiscountCodeInput(control.value), { emitEvent: false });
    }

    submit(): void {
        if (this.form.invalid || this.submitting()) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const terms = {
            discountPercent: v.discountPercent ?? 0,
            commissionPercent: v.commissionPercent ?? 0,
            validFromUtc: istanbulDayStartUtc(v.validFrom),
            validUntilUtc: istanbulDayStartUtc(v.validUntil),
            maxRedemptions: v.maxRedemptions ?? null
        };
        const existing = this.code();

        this.submitting.set(true);
        this.error.set(null);
        (existing ? this.partners.updateCode(this.partnerId(), existing.id, terms) : this.partners.createCode(this.partnerId(), { ...terms, code: v.code })).subscribe({
            next: (saved) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.saved.emit(saved);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.error.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }
}
