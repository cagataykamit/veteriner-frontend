import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal, model } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { SpeciesUpsertRequest } from '@/app/features/species/models/species-upsert.model';
import { SpeciesService } from '@/app/features/species/services/species.service';
import {
    type SpeciesUpsertFieldErrors,
    parseSpeciesUpsertHttpError
} from '@/app/features/species/utils/species-upsert-validation-parse.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

/**
 * Hayvan formunda tam sayfa ayrılmadan tür oluşturma (`SpeciesUpsertRequest` create hattı).
 */
@Component({
    selector: 'app-quick-species-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
    template: `
        <p-dialog
            header="Yeni tür"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: 'min(480px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
            (onShow)="onShow()"
        >
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3" role="status">
                    İşletme salt okunur moddadır; tür oluşturulamaz.
                </p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="quick-species-form">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="qs-code" class="block text-sm font-medium text-muted-color mb-2">Kod *</label>
                        <input id="qs-code" pInputText class="w-full" formControlName="code" autocomplete="off" />
                        @if (apiFieldErrors().code) {
                            <small class="text-red-500">{{ apiFieldErrors().code }}</small>
                        } @else if (form.controls.code.invalid && form.controls.code.touched) {
                            @if (form.controls.code.hasError('required')) {
                                <small class="text-red-500">Kod zorunludur.</small>
                            } @else if (form.controls.code.hasError('maxlength')) {
                                <small class="text-red-500">Kod en fazla 32 karakter olabilir.</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qs-name" class="block text-sm font-medium text-muted-color mb-2">Ad *</label>
                        <input id="qs-name" pInputText class="w-full" formControlName="name" />
                        @if (apiFieldErrors().name) {
                            <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                        } @else if (form.controls.name.invalid && form.controls.name.touched) {
                            @if (form.controls.name.hasError('required')) {
                                <small class="text-red-500">Ad zorunludur.</small>
                            } @else if (form.controls.name.hasError('maxlength')) {
                                <small class="text-red-500">Ad en fazla 128 karakter olabilir.</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qs-isActive" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="qs-isActive"
                            formControlName="isActive"
                            [options]="activeOptions"
                            optionLabel="label"
                            optionValue="value"
                            styleClass="w-full"
                            appendTo="body"
                        />
                        @if (apiFieldErrors().isActive) {
                            <small class="text-red-500">{{ apiFieldErrors().isActive }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qs-displayOrder" class="block text-sm font-medium text-muted-color mb-2">Sıra *</label>
                        <input id="qs-displayOrder" type="number" min="0" class="w-full p-inputtext p-component" formControlName="displayOrder" />
                        @if (apiFieldErrors().displayOrder) {
                            <small class="text-red-500">{{ apiFieldErrors().displayOrder }}</small>
                        } @else if (form.controls.displayOrder.invalid && form.controls.displayOrder.touched) {
                            @if (form.controls.displayOrder.hasError('required')) {
                                <small class="text-red-500">Sıra zorunludur.</small>
                            } @else if (form.controls.displayOrder.hasError('min')) {
                                <small class="text-red-500">Sıra 0 veya daha büyük olmalıdır.</small>
                            }
                        }
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template pTemplate="footer">
                <p-button type="button" label="İptal" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    label="Kaydet"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting() || ro.mutationBlocked()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class QuickSpeciesDialogComponent {
    readonly visible = model(false);
    readonly speciesCreated = output<string>();

    private readonly fb = inject(FormBuilder);
    private readonly speciesService = inject(SpeciesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<SpeciesUpsertFieldErrors>({});

    readonly activeOptions = [
        { label: 'Aktif', value: true },
        { label: 'Pasif', value: false }
    ];

    readonly form = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(32)]],
        name: ['', [Validators.required, Validators.maxLength(128)]],
        isActive: [true, Validators.required],
        displayOrder: [0, [Validators.required, Validators.min(0)]]
    });

    onShow(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        this.form.reset({
            code: '',
            name: '',
            isActive: true,
            displayOrder: 0
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        const payload: SpeciesUpsertRequest = {
            code: v.code.trim(),
            name: v.name.trim(),
            isActive: !!v.isActive,
            displayOrder: Number(v.displayOrder)
        };

        this.submitting.set(true);
        this.speciesService.createSpecies(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.speciesCreated.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseSpeciesUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
