import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { createStrongPasswordValidators, getPasswordPolicyErrorMessage, PASSWORD_POLICY_REQUIREMENT, PASSWORD_ERROR_MESSAGES, passwordsMatchValidator } from '@/app/core/validation/password-policy.util';
import { AccountService } from '@/app/features/account/services/account.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { extractRawValidationErrors, firstStringMessage, parseValidationFieldErrors } from '@/app/shared/utils/validation-error-parse.utils';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

type ChangePasswordFieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

const CHANGE_PASSWORD_FIELD_MAP: Record<string, ChangePasswordFieldKey> = {
    currentpassword: 'currentPassword',
    newpassword: 'newPassword',
    confirmpassword: 'confirmPassword'
};

const ACCOUNT_ROUTE = '/panel/settings/account';
const CHANGE_PASSWORD_FALLBACK ='Şifre değiştirilemedi. Lütfen bilgileri kontrol edin.';
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
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, PasswordModule, ToastModule, FormSubmitDirective, FormErrorSummaryComponent, AppPageHeaderComponent],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="top-right" />

        <!-- Diğer ayar sayfalarıyla aynı başlık ve düz kart, sola yaslı (A-07: ortalanmış gölgeli kart eski şablondu). -->
        <app-page-header title="Şifre değiştir" description="Hesabınızın giriş şifresini güncelleyin. Oturumunuz açık kalır." />
        <div class="card">
            <p class="text-muted-color text-sm mt-0 mb-4">{{ passwordPolicyRequirement }}</p>

            <form appFormSubmit [formGroup]="form" (ngSubmit)="onSubmit()" class="w-full max-w-xl">
                <app-form-error-summary />
                <div class="mb-5">
                    <label for="currentPassword" class="block text-sm font-medium text-muted-color mb-2">Mevcut şifre *</label>
                    <p-password inputId="currentPassword" formControlName="currentPassword" [toggleMask]="true" [feedback]="false" class="w-full" inputStyleClass="w-full" autocomplete="current-password" />
                    @if (form.controls.currentPassword.invalid && form.controls.currentPassword.touched) {
                        @if (form.controls.currentPassword.errors?.['required']) {
                            <small class="text-danger">Mevcut şifre zorunludur.</small>
                        }
                    }
                </div>

                <div class="mb-5">
                    <label for="newPassword" class="block text-sm font-medium text-muted-color mb-2">Yeni şifre *</label>
                    <p-password inputId="newPassword" formControlName="newPassword" [toggleMask]="true" [feedback]="false" class="w-full" inputStyleClass="w-full" autocomplete="new-password" />
                    @if (form.controls.newPassword.invalid && form.controls.newPassword.touched) {
                        @if (passwordPolicyErrorMessage(form.controls.newPassword.errors); as msg) {
                            <small class="text-danger">{{ msg }}</small>
                        }
                    }
                </div>

                <div class="mb-6">
                    <label for="confirmPassword" class="block text-sm font-medium text-muted-color mb-2">Yeni şifre (tekrar) *</label>
                    <p-password inputId="confirmPassword" formControlName="confirmPassword" [toggleMask]="true" [feedback]="false" class="w-full" inputStyleClass="w-full" autocomplete="new-password" />
                    @if (form.controls.confirmPassword.invalid && form.controls.confirmPassword.touched) {
                        @if (form.controls.confirmPassword.errors?.['required']) {
                            <small class="text-danger">Şifre tekrarı zorunludur.</small>
                        }
                    } @else if (form.errors?.['passwordMismatch'] && form.controls.confirmPassword.touched) {
                        <small class="text-danger">{{ passwordMismatchMessage }}</small>
                    }
                </div>

                <div>
                    <button pButton type="submit" [disabled]="saving()"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Kaydet</button>
                </div>
            </form>
        </div>
    `
})
export class ChangePasswordPageComponent implements HasUnsavedChanges {
    private readonly fb = inject(FormBuilder);
    private readonly account = inject(AccountService);
    private readonly messages = inject(MessageService);
    private readonly router = inject(Router);

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

    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

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
                // Hata bildirimi kapatılana kadar kalır; 3 sn içinde okunmadan kaybolmasın (H19).
                sticky: true,
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
                    this.form.markAsPristine();
                    void this.router.navigate([ACCOUNT_ROUTE], { queryParams: { passwordChanged: '1' } });
                },
                error: (err: unknown) => {
                    this.messages.add({
                        severity: 'error',
                        summary: 'Hata',
                        sticky: true,
                        detail: resolveChangePasswordErrorMessage(err)
                    });
                }
            });
    }
}
