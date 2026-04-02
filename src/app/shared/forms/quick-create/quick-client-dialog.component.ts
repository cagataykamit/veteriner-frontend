import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, output, signal, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CreateClientRequest } from '@/app/features/clients/models/client-create.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import {
    type ClientCreateFieldErrors,
    type ClientCreateFormFieldKey,
    parseClientCreateHttpError
} from '@/app/features/clients/utils/client-create-validation-parse.utils';
import {
    CLIENT_CREATE_PHONE_MSG_INVALID,
    turkishMobilePhoneValidator
} from '@/app/features/clients/utils/client-create-phone.utils';
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
            header="Yeni müşteri"
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
                        @if (apiFieldErrors().fullName) {
                            <small class="text-red-500">{{ apiFieldErrors().fullName }}</small>
                        } @else if (form.controls.fullName.invalid && form.controls.fullName.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qc-phone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                        <input id="qc-phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                        @if (apiFieldErrors().phone) {
                            <small class="text-red-500">{{ apiFieldErrors().phone }}</small>
                        } @else if (form.controls.phone.invalid && form.controls.phone.touched) {
                            @if (form.controls.phone.hasError('phoneInvalidChars') || form.controls.phone.hasError('phoneInvalidFormat')) {
                                <small class="text-red-500">{{ phoneMsgInvalid }}</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qc-email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                        <input id="qc-email" type="email" pInputText class="w-full" formControlName="email" />
                        @if (apiFieldErrors().email) {
                            <small class="text-red-500">{{ apiFieldErrors().email }}</small>
                        } @else if (form.controls.email.invalid && form.controls.email.touched) {
                            <small class="text-red-500">Geçerli e-posta girin.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="qc-address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                        <textarea id="qc-address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                        @if (apiFieldErrors().address) {
                            <small class="text-red-500">{{ apiFieldErrors().address }}</small>
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

    readonly phoneMsgInvalid = CLIENT_CREATE_PHONE_MSG_INVALID;

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        fullName: ['', Validators.required],
        phone: ['', turkishMobilePhoneValidator()],
        email: ['', Validators.email],
        address: ['']
    });

    constructor() {
        const fields: ClientCreateFormFieldKey[] = ['fullName', 'phone', 'email', 'address'];
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

        const v = this.form.getRawValue();
        const payload: CreateClientRequest = {
            fullName: v.fullName.trim(),
            phone: v.phone.trim() || undefined,
            email: v.email.trim() || undefined,
            address: v.address.trim() || undefined
        };

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
