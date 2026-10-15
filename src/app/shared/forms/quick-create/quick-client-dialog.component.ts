import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, output, signal, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { mapClientUpsertFormValueToCreateRequest } from '@/app/features/clients/data/client.mapper';
import {
    createClientUpsertFormGroup,
    getClientUpsertFormValue
} from '@/app/features/clients/forms/client-upsert-form.factory';
import { CLIENT_UPSERT_FORM_FIELDS } from '@/app/features/clients/forms/client-upsert-form.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import {
    type ClientCreateFieldErrors,
    type ClientCreateFormFieldKey,
    parseClientCreateHttpError
} from '@/app/features/clients/utils/client-create-validation-parse.utils';
import { clientUpsertFieldErrorMessage } from '@/app/features/clients/utils/client-upsert.validation.utils';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

/**
 * Randevu / muayene formlarında tam sayfa ayrılmadan müşteri oluşturma (create contract ile aynı).
 */
@Component({
    selector: 'app-quick-client-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
    template: `
        <p-dialog
            header="Yeni müşteri ekle"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: 'min(520px, 95vw)' }"
            [(visible)]="visible"
            (onShow)="onShow()"
        >
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="quick-client-form">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="qc-fullName" class="block text-sm font-medium text-muted-color mb-2">Ad soyad *</label>
                        <input id="qc-fullName" pInputText class="w-full" formControlName="fullName" />
                        @if (fieldMessage('fullName'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qc-phone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                        <input id="qc-phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                        @if (fieldMessage('phone'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qc-email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                        <input id="qc-email" type="email" pInputText class="w-full" formControlName="email" />
                        @if (fieldMessage('email'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="qc-address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                        <textarea id="qc-address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                        @if (fieldMessage('address'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
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
                    label="Müşteriyi kaydet"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class QuickClientDialogComponent {
    readonly visible = model(false);
    readonly clientCreated = output<string>();

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});

    readonly form = createClientUpsertFormGroup(this.fb);

    constructor() {
        for (const f of CLIENT_UPSERT_FORM_FIELDS) {
            this.form.controls[f].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();

                if (cur[f]) {
                    const next = { ...cur };

                    delete next[f];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    fieldMessage(field: ClientCreateFormFieldKey): string | null {
        const api = this.apiFieldErrors()[field];

        if (api) {
            return api;
        }

        const control = this.form.controls[field];

        if (!control.invalid || !control.touched) {
            return null;
        }

        return clientUpsertFieldErrorMessage(field, control.errors);
    }

    onShow(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        this.form.reset({
            fullName: '',
            phone: '',
            email: '',
            address: ''
        });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const payload = mapClientUpsertFormValueToCreateRequest(getClientUpsertFormValue(this.form));

        this.submitting.set(true);
        this.clientsService.createClient(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.clientCreated.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseClientCreateHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
