import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { ExaminationAddendumVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

export const ADDENDUM_TEXT_MAX = 4000;

/** Metin kırpılmış uzunlukla doğrulanır (boşluk-only metin geçersiz). */
function addendumText(c: { value: unknown }): { addendumText: true } | null {
    const len = typeof c.value === 'string' ? c.value.trim().length : 0;
    return len >= 1 && len <= ADDENDUM_TEXT_MAX ? null : { addendumText: true };
}

/**
 * Kesinleşmiş muayeneye ek not (`Examinations.Addendum`): gerekçe 5–500, metin ≤ 4000. Ek not silinemez/düzenlenemez.
 * Backend'de idempotency yoktur; gönderim sürerken tekrar tıklama ikinci kayıt oluşturmaz (kilit burada).
 * Yetki denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-examination-addendum-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, DialogModule, ButtonModule],
    template: `
        <p-dialog
            header="Ek not ekle"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(620px, 95vw)' }"
            [(visible)]="visible"
        >
            <p class="mt-0 text-muted-color">Ek not kalıcıdır; eklendikten sonra düzenlenemez veya silinemez. İlk muayene metni değişmez.</p>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12">
                        <label for="ad-reason" class="block text-sm font-medium text-muted-color mb-2">Gerekçe *</label>
                        <textarea id="ad-reason" rows="2" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                        @if (form.controls.reason.invalid && form.controls.reason.touched) {
                            <small class="text-red-500">Gerekçe {{ reasonMin }}–{{ reasonMax }} karakter olmalıdır.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="ad-text" class="block text-sm font-medium text-muted-color mb-2">Ek not *</label>
                        <textarea id="ad-text" rows="6" class="w-full p-inputtext p-component" formControlName="text"></textarea>
                        <small class="text-muted-color">{{ form.controls.text.value.trim().length }} / {{ textMax }}</small>
                        @if (form.controls.text.invalid && form.controls.text.touched) {
                            <small class="text-red-500 ml-2">Ek not 1–{{ textMax }} karakter olmalıdır.</small>
                        }
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert" data-testid="addendum-error">{{ submitError() }}</p>
                }
            </form>
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    label="Ek notu kaydet"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting()"
                    data-testid="addendum-submit"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class ExaminationAddendumDialogComponent {
    readonly visible = model(false);
    readonly examinationId = input.required<string>();
    readonly added = output<ExaminationAddendumVm>();

    private readonly fb = inject(FormBuilder);
    private readonly examinationsService = inject(ExaminationsService);

    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;
    protected readonly textMax = ADDENDUM_TEXT_MAX;

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        reason: ['', reasonLength],
        text: ['', [Validators.required, addendumText]]
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.form.reset({ reason: '', text: '' });
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
        this.submitError.set(null);
        this.submitting.set(true);
        this.examinationsService.addAddendum(this.examinationId(), this.form.getRawValue()).subscribe({
            next: (addendum) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.added.emit(addendum);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Ek not kaydedilemedi.'));
            }
        });
    }
}
