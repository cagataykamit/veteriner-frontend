import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import {
    createStrongPasswordValidators,
    getPasswordPolicyErrorMessage,
    PASSWORD_POLICY_REQUIREMENT,
    PASSWORD_ERROR_MESSAGES,
    passwordsMatchValidator
} from '@/app/core/validation/password-policy.util';
import { AccountService } from '@/app/features/account/services/account.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationFieldErrors
} from '@/app/shared/utils/validation-error-parse.utils';

type ChangePasswordFieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

const CHANGE_PASSWORD_FIELD_MAP: Record<string, ChangePasswordFieldKey> = {
    currentpassword: 'currentPassword',
    newpassword: 'newPassword',
    confirmpassword: 'confirmPassword'
};

const CHANGE_PASSWORD_FALLBACK = 'Şifre değiştirilemedi. Lütfen bilgileri kontrol edin.';
const SAME_PASSWORD_MESSAGE = 'Yeni şifre mevcut şifre ile aynı olamaz.';

function resolveChangePasswordErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
        if (err instanceof Error) {
            const message = err.message?.trim();
            if (message) {
                return message;
            }
        }
        return CHANGE_PASSWORD_FALLBACK;
    }

    const fieldErrors = parseValidationFieldErrors<ChangePasswordFieldKey>(err.error, {
        fieldMap: CHANGE_PASSWORD_FIELD_MAP
    });

    for (const key of ['newPassword', 'currentPassword', 'confirmPassword'] as const) {
        const message = fieldErrors[key];
        if (message) {
            return message;
        }
    }

    const raw = extractRawValidationErrors(err.error);
    if (raw) {
        for (const value of Object.values(raw)) {
            const message = firstStringMessage(value);
            if (message) {
                return message;
            }
        }
    }

    return messageFromHttpError(err, CHANGE_PASSWORD_FALLBACK);
}

@Component({
    selector: 'app-change-password-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, PasswordModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" />

        <div class="flex justify-center w-full">
            <div
                class="w-full max-w-4xl bg-surface-0 dark:bg-surface-900 rounded-2xl shadow-md border border-surface-200 dark:border-surface-700 px-6 py-8 md:px-12 md:py-10"
            >
                <div class="text-center max-w-2xl mx-auto">
                    <h1 class="text-surface-900 dark:text-surface-0 text-lg font-semibold m-0">Şifre Değiştir</h1>
                    <p class="text-muted-color mt-3 mb-0">
                        Hesabınızın giriş şifresini güncelleyin. Oturumunuz açık kalır.
                    </p>
                    <p class="text-muted-color text-sm mt-3 mb-0">
                        {{ passwordPolicyRequirement }}
                    </p>
                </div>

                <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mx-auto mt-10 w-full max-w-2xl">
                    <div class="mb-5">
                        <label for="currentPassword" class="block text-sm font-medium text-muted-color mb-2">Mevcut şifre *</label>
                        <p-password
                            inputId="currentPassword"
                            formControlName="currentPassword"
                            [toggleMask]="true"
                            [feedback]="false"
                            styleClass="w-full"
                            inputStyleClass="w-full"
                            autocomplete="current-password"
                        />
                        @if (form.controls.currentPassword.invalid && form.controls.currentPassword.touched) {
                            @if (form.controls.currentPassword.errors?.['required']) {
                                <small class="text-red-500">Mevcut şifre zorunludur.</small>
                            }
                        }
                    </div>

                    <div class="mb-5">
                        <label for="newPassword" class="block text-sm font-medium text-muted-color mb-2">Yeni şifre *</label>
                        <p-password
                            inputId="newPassword"
                            formControlName="newPassword"
                            [toggleMask]="true"
                            [feedback]="false"
                            styleClass="w-full"
                            inputStyleClass="w-full"
                            autocomplete="new-password"
                        />
                        @if (form.controls.newPassword.invalid && form.controls.newPassword.touched) {
                            @if (passwordPolicyErrorMessage(form.controls.newPassword.errors); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        }
                    </div>

                    <div class="mb-6">
                        <label for="confirmPassword" class="block text-sm font-medium text-muted-color mb-2">Yeni şifre (tekrar) *</label>
                        <p-password
                            inputId="confirmPassword"
                            formControlName="confirmPassword"
                            [toggleMask]="true"
                            [feedback]="false"
                            styleClass="w-full"
                            inputStyleClass="w-full"
                            autocomplete="new-password"
                        />
                        @if (form.controls.confirmPassword.invalid && form.controls.confirmPassword.touched) {
                            @if (form.controls.confirmPassword.errors?.['required']) {
                                <small class="text-red-500">Şifre tekrarı zorunludur.</small>
                            }
                        } @else if (form.errors?.['passwordMismatch'] && form.controls.confirmPassword.touched) {
                            <small class="text-red-500">{{ passwordMismatchMessage }}</small>
                        }
                    </div>

                    <p-button
                        type="submit"
                        label="Kaydet"
                        icon="pi pi-save"
                        styleClass="w-full"
                        [loading]="saving()"
                        [disabled]="form.invalid || saving()"
                    />
                </form>
            </div>
        </div>
    `
})
export class ChangePasswordPageComponent {
    private readonly fb = inject(FormBuilder);
    private readonly account = inject(AccountService);
    private readonly messages = inject(MessageService);

    readonly saving = signal(false);
    readonly passwordPolicyRequirement = PASSWORD_POLICY_REQUIREMENT;
    readonly passwordMismatchMessage = PASSWORD_ERROR_MESSAGES.passwordMismatch;
    readonly passwordPolicyErrorMessage = getPasswordPolicyErrorMessage;

    readonly form = this.fb.nonNullable.group(
        {
            currentPassword: ['', Validators.required],
            newPassword: ['', createStrongPasswordValidators()],
            confirmPassword: ['', Validators.required]
        },
        { validators: passwordsMatchValidator() }
    );

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        if (value.currentPassword === value.newPassword) {
            this.messages.add({
                severity: 'error',
                summary: 'Hata',
                detail: SAME_PASSWORD_MESSAGE
            });
            return;
        }
        this.saving.set(true);
        this.account
            .changePassword(value)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    this.form.reset();
                    this.messages.add({
                        severity: 'success',
                        summary: 'Başarılı',
                        detail: 'Şifreniz güncellendi.'
                    });
                },
                error: (err: unknown) => {
                    this.messages.add({
                        severity: 'error',
                        summary: 'Hata',
                        detail: resolveChangePasswordErrorMessage(err)
                    });
                }
            });
    }
}
