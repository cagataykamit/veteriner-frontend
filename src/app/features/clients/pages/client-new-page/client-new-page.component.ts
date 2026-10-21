import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ClientContactPreferenceFieldsComponent } from '@/app/features/clients/components/client-contact-preference-fields.component';
import { ClientInvoicingFieldsComponent } from '@/app/features/clients/components/client-invoicing-fields.component';
import { mapClientUpsertFormValueToCreateRequest } from '@/app/features/clients/data/client.mapper';
import {
    type ClientInvoicingFieldKey,
    createClientInvoicingFormGroup,
    isClientInvoicingDtoEmpty,
    mapClientInvoicingFormToDto
} from '@/app/features/clients/forms/client-invoicing-form.factory';
import { parseClientInvoicingFieldErrors } from '@/app/features/clients/utils/client-invoicing.utils';
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
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-client-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        ClientContactPreferenceFieldsComponent,
        ClientInvoicingFieldsComponent,
        AppPageHeaderComponent
    ],
    template: `
        <app-page-header categoryLink="/panel/clients" categoryLinkLabel="Müşteri listesine dön" title="Yeni Müşteri" description="Müşteri kaydı oluşturun." />

        <div class="card">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="fullName" class="block text-sm font-medium text-muted-color mb-2">Ad soyad *</label>
                        <input id="fullName" pInputText class="w-full" formControlName="fullName" />
                        @if (fieldMessage('fullName'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="phone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                        <input id="phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                        @if (fieldMessage('phone'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                        <input id="email" type="email" pInputText class="w-full" formControlName="email" />
                        @if (fieldMessage('email'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                        <textarea id="address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                        @if (fieldMessage('address'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <app-client-contact-preference-fields [form]="form" />
                    </div>
                    <div class="col-span-12">
                        <app-client-invoicing-fields [form]="invoicingForm" [open]="invoicingOpen()" [apiErrors]="invoicingApiErrors()" />
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <p-button
                        type="submit"
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || invoicingForm.invalid || submitting()"
                    />
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="goList()"
                        [disabled]="submitting()"
                    />
                </div>
            </form>
        </div>
    `
})
export class ClientNewPageComponent {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Sunucu / ValidationProblemDetails alan mesajları — input altında gösterilir. */
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});

    readonly form = createClientUpsertFormGroup(this.fb);
    readonly invoicingForm = createClientInvoicingFormGroup(this.fb);
    readonly invoicingOpen = signal(false);
    readonly invoicingApiErrors = signal<Partial<Record<ClientInvoicingFieldKey, string>>>({});

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

    goList(): void {
        void this.router.navigate(['/panel/clients']);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        this.invoicingApiErrors.set({});

        if (this.form.invalid || this.invoicingForm.invalid) {
            this.form.markAllAsTouched();
            this.invoicingForm.markAllAsTouched();

            return;
        }

        // Fatura bölümü hiç doldurulmadıysa gövdeye girmez (isteğe bağlı, ADR-036).
        const invoicing = mapClientInvoicingFormToDto(this.invoicingForm.getRawValue());
        const payload = {
            ...mapClientUpsertFormValueToCreateRequest(getClientUpsertFormValue(this.form)),
            ...(isClientInvoicingDtoEmpty(invoicing) ? {} : { invoicingIdentity: invoicing })
        };

        this.submitting.set(true);
        this.clientsService.createClient(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/clients', id], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseClientCreateHttpError(e);
                    const invoicingErrors = parseClientInvoicingFieldErrors(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.invoicingApiErrors.set(invoicingErrors);
                    this.invoicingOpen.set(this.invoicingOpen() || Object.keys(invoicingErrors).length > 0);
                    this.submitError.set(parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
