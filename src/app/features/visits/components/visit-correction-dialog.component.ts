import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import type { TodayItemVm, VisitCorrectionAction, VisitVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { careStatusLabel, correctionActionOptions } from '@/app/features/visits/utils/visit-status.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const REASON_MIN = 5;
const REASON_MAX = 500;

/** Sözleşme: gerekçe trim sonrası 5–500 karakter. */
function reasonLength(c: AbstractControl): ValidationErrors | null {
    const len = typeof c.value === 'string' ? c.value.trim().length : 0;
    return len >= REASON_MIN && len <= REASON_MAX ? null : { reasonLength: true };
}

/**
 * Geliş düzeltmesi (`Visits.Correct`): durumu geri/ileri al veya yanlış geliş olarak işaretle. Gerekçe zorunlu. `mode="restore"` ile yanlış gelişi geri alır (aynı gerekçe kuralı).
 * Yetki denetimi çağıran bileşende yapılır; bu diyalog yalnızca yetkili kullanıcıya açılır.
 */
@Component({
    selector: 'app-visit-correction-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule],
    template: `
        <p-dialog
            [header]="restoring() ? 'Yanlış gelişi geri al' : 'Geliş düzeltmesi'"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(560px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
        >
            @if (item(); as it) {
                <p class="mt-0 mb-4">
                    <span class="font-medium">{{ it.petName }}</span> · {{ it.clientName }}
                    @if (it.careStatus) {
                        <span class="text-muted-color"> — şu an: {{ statusLabel(it.careStatus) }}</span>
                    }
                </p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="visit-correction-form">
                <div class="grid grid-cols-12 gap-4">
                    @if (!restoring()) {
                        <div class="col-span-12">
                            <label for="vc-action" class="block text-sm font-medium text-muted-color mb-2">Düzeltme *</label>
                            <p-select
                                inputId="vc-action"
                                formControlName="action"
                                [options]="actionOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Düzeltme seçin"
                                styleClass="w-full"
                                appendTo="body"
                            />
                            @if (form.controls.action.invalid && form.controls.action.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
                    }
                    <div class="col-span-12">
                        <label for="vc-reason" class="block text-sm font-medium text-muted-color mb-2">Gerekçe *</label>
                        <textarea id="vc-reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                        @if (form.controls.reason.invalid && form.controls.reason.touched) {
                            <small class="text-red-500">Gerekçe {{ reasonMin }}–{{ reasonMax }} karakter olmalıdır.</small>
                        }
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    [label]="restoring() ? 'Geri al' : 'Düzeltmeyi kaydet'"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class VisitCorrectionDialogComponent {
    readonly visible = model(false);
    /** Düzeltilecek satır (`visitId` dolu olmalı). */
    readonly item = input<TodayItemVm | null>(null);
    /** `restore`: yanlış geliş işaretini kaldırır (durum seçimi yok, yalnızca gerekçe). */
    readonly mode = input<'correct' | 'restore'>('correct');
    protected readonly restoring = computed(() => this.mode() === 'restore');
    readonly corrected = output<VisitVm>();

    private readonly fb = inject(FormBuilder);
    private readonly visitsService = inject(VisitsService);

    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;
    protected readonly statusLabel = careStatusLabel;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly actionOptions = computed(() => {
        const status = this.item()?.careStatus;
        return status ? correctionActionOptions(status) : [];
    });

    readonly form = this.fb.group({
        action: this.fb.control<VisitCorrectionAction | null>(null, Validators.required),
        reason: this.fb.nonNullable.control('', reasonLength)
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.prepareForm());
            }
        });
    }

    /** Diyalog her açıldığında formu sıfırlar (p-dialog onShow animasyondan sonra tetiklenip yazılanı silerdi). */
    private prepareForm(): void {
        this.submitError.set(null);
        this.form.reset({ action: null, reason: '' });
        // Geri almada durum seçimi yoktur; devre dışı kontrol geçerliliği etkilemez.
        if (this.restoring()) {
            this.form.controls.action.disable({ emitEvent: false });
        } else {
            this.form.controls.action.enable({ emitEvent: false });
        }
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        const visitId = this.item()?.visitId;
        const { action, reason } = this.form.getRawValue();
        if (this.submitting() || !visitId) {
            return;
        }
        if (this.form.invalid || (!action && !this.restoring())) {
            this.form.markAllAsTouched();
            return;
        }
        this.submitError.set(null);
        this.submitting.set(true);
        const call$ = this.restoring() ? this.visitsService.restoreVisit(visitId, reason) : this.visitsService.correctVisit(visitId, { action: action!, reason });
        call$.subscribe({
            next: (visit) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.corrected.emit(visit);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, this.restoring() ? 'Geri alma kaydedilemedi.' : 'Düzeltme kaydedilemedi.'));
            }
        });
    }
}
