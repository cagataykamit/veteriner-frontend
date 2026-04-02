import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { BreedUpsertRequest } from '@/app/features/breeds/models/breed-upsert.model';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import {
    type BreedUpsertFieldErrors,
    type BreedUpsertFormFieldKey,
    parseBreedUpsertHttpError
} from '@/app/features/breeds/utils/breed-upsert-validation-parse.utils';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

/**
 * Hayvan quick-create içinde, seçili türe yeni ırk eklemek (`BreedUpsertRequest` create hattı).
 */
@Component({
    selector: 'app-quick-breed-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
    template: `
        <p-dialog
            header="Yeni ırk"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: 'min(440px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
            (onShow)="onShow()"
        >
            @if (speciesLabel().trim()) {
                <p class="text-sm text-muted-color mt-0 mb-3">{{ speciesLabel() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="quick-breed-form">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12">
                        <label for="qb-name" class="block text-sm font-medium text-muted-color mb-2">Irk adı *</label>
                        <input id="qb-name" pInputText class="w-full" formControlName="name" />
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
                        <label for="qb-isActive" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="qb-isActive"
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
                    [disabled]="form.invalid || submitting() || !speciesIdContext()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class QuickBreedDialogComponent {
    /** Seçili tür kimliği (quick-pet formundan). */
    readonly speciesId = input<string>('');
    /** Gösterim: "Tür: Köpek" vb. */
    readonly speciesLabel = input<string>('');

    readonly visible = model(false);
    readonly breedCreated = output<string>();

    private readonly fb = inject(FormBuilder);
    private readonly breedsService = inject(BreedsService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<BreedUpsertFieldErrors>({});

    readonly activeOptions = [
        { label: 'Aktif', value: true },
        { label: 'Pasif', value: false }
    ];

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(128)]],
        isActive: [true, Validators.required]
    });

    constructor() {
        this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            const cur = this.apiFieldErrors();
            if (cur.name) {
                const next = { ...cur };
                delete next.name;
                this.apiFieldErrors.set(next);
            }
        });
        this.form.controls.isActive.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            const cur = this.apiFieldErrors();
            if (cur.isActive) {
                const next = { ...cur };
                delete next.isActive;
                this.apiFieldErrors.set(next);
            }
        });
    }

    speciesIdContext(): string {
        return trimClientIdControlValue(this.speciesId());
    }

    onShow(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        this.form.reset({
            name: '',
            isActive: true
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        const sid = this.speciesIdContext();
        if (!sid) {
            this.submitError.set('Tür seçili değil.');
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        const payload: BreedUpsertRequest = {
            speciesId: sid,
            name: v.name.trim(),
            isActive: !!v.isActive
        };

        this.submitting.set(true);
        this.breedsService.createBreed(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.breedCreated.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseBreedUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
