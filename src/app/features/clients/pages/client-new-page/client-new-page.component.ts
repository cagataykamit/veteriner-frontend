import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { CreateClientRequest } from '@/app/features/clients/models/client-create.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import {
    type ClientCreateFieldErrors,
    type ClientCreateFormFieldKey,
    parseClientCreateHttpError
} from '@/app/features/clients/utils/client-create-validation-parse.utils';
import {
    CLIENT_CREATE_PHONE_MSG_INVALID,
    CLIENT_CREATE_PHONE_MSG_REQUIRED,
    turkishMobilePhoneValidator
} from '@/app/features/clients/utils/client-create-phone.utils';
import { CLIENT_STATUS_FORM_OPTIONS } from '@/app/features/clients/utils/client-status.utils';
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
        SelectModule,
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/clients" class="text-primary font-medium no-underline inline-block mb-4">← Müşteri listesine dön</a>

        <app-page-header title="Yeni Müşteri" subtitle="Hasta yönetimi" description="Müşteri kaydı oluşturun." />

        <div class="card">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="fullName" class="block text-sm font-medium text-muted-color mb-2">Ad soyad *</label>
                        <input id="fullName" pInputText class="w-full" formControlName="fullName" />
                        @if (apiFieldErrors().fullName) {
                            <small class="text-red-500">{{ apiFieldErrors().fullName }}</small>
                        } @else if (form.controls.fullName.invalid && form.controls.fullName.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="phone" class="block text-sm font-medium text-muted-color mb-2">Telefon *</label>
                        <input id="phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                        @if (apiFieldErrors().phone) {
                            <small class="text-red-500">{{ apiFieldErrors().phone }}</small>
                        } @else if (form.controls.phone.invalid && form.controls.phone.touched) {
                            @if (form.controls.phone.hasError('phoneRequired')) {
                                <small class="text-red-500">{{ phoneMsgRequired }}</small>
                            } @else if (
                                form.controls.phone.hasError('phoneInvalidChars') ||
                                form.controls.phone.hasError('phoneInvalidFormat')
                            ) {
                                <small class="text-red-500">{{ phoneMsgInvalid }}</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                        <input id="email" type="email" pInputText class="w-full" formControlName="email" />
                        @if (apiFieldErrors().email) {
                            <small class="text-red-500">{{ apiFieldErrors().email }}</small>
                        } @else if (form.controls.email.invalid && form.controls.email.touched) {
                            <small class="text-red-500">Geçerli e-posta girin.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="status" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="status"
                            formControlName="status"
                            [options]="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Durum seçin"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().status) {
                            <small class="text-red-500">{{ apiFieldErrors().status }}</small>
                        } @else if (form.controls.status.invalid && form.controls.status.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                        <textarea id="address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                        @if (apiFieldErrors().address) {
                            <small class="text-red-500">{{ apiFieldErrors().address }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (apiFieldErrors().notes) {
                            <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
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

    readonly phoneMsgRequired = CLIENT_CREATE_PHONE_MSG_REQUIRED;
    readonly phoneMsgInvalid = CLIENT_CREATE_PHONE_MSG_INVALID;

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Sunucu / ValidationProblemDetails alan mesajları — input altında gösterilir. */
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});

    readonly statusOptions = [...CLIENT_STATUS_FORM_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        fullName: ['', Validators.required],
        phone: ['', turkishMobilePhoneValidator()],
        email: ['', Validators.email],
        address: [''],
        notes: [''],
        status: ['active', Validators.required]
    });

    constructor() {
        const fields: ClientCreateFormFieldKey[] = ['fullName', 'phone', 'email', 'address', 'notes', 'status'];
        for (const f of fields) {
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

        const v = this.form.getRawValue();
        const payload: CreateClientRequest = {
            fullName: v.fullName,
            phone: v.phone.trim(),
            email: v.email.trim() || undefined,
            address: v.address.trim() || undefined,
            notes: v.notes.trim() || undefined,
            status: v.status
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
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }
}
