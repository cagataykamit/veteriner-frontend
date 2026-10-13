import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-client-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/clients" class="text-primary font-medium no-underline inline-block mb-4">← Müşteri listesine dön</a>

        <app-page-header title="Yeni Müşteri" description="Müşteri kaydı oluşturun." />

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
                        [disabled]="form.invalid || submitting()"
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
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = mapClientUpsertFormValueToCreateRequest(getClientUpsertFormValue(this.form));

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
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
