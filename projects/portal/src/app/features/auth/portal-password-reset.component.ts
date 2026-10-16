import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { PORTAL_ERROR_CODES, portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import {
    normalizeOneTimeCode,
    PORTAL_PASSWORD_HINT,
    PORTAL_PASSWORD_MISMATCH_MESSAGE,
    portalEmailValidators,
    portalFieldError,
    portalOneTimeCodeValidator,
    portalPasswordsMatch,
    portalStrongPasswordValidator
} from '@portal/app/shared/validation/portal-form-rules';
import { PortalResendTimer } from './portal-resend-timer';

type ResetStep = 'request' | 'confirm' | 'done';

export const RESET_CODE_SENT_MESSAGE = 'Bu e-posta adresiyle bir hesap varsa parola sıfırlama kodu gönderildi. Kod 10 dakika geçerlidir.';

const RESET_ERROR_OVERRIDES = {
    [PORTAL_ERROR_CODES.invalidCredentials]: 'Kod doğrulanamadı. Kod yanlış, süresi dolmuş ya da hesap geçici olarak kilitli olabilir; yeni kod isteyip tekrar deneyin.',
    [PORTAL_ERROR_CODES.validation]: 'Yeni parola kurallara uymuyor.'
};

/**
 * Parola sıfırlama (sözleşme §5.6): e-posta → kod + yeni parola. Başarıda sunucu tüm portal oturumlarını kapatır;
 * kullanıcı yeni parolasıyla giriş yapar. Parolası olmayan (kodla giren) hesap da bu akışla parola belirler.
 */
@Component({
    selector: 'portal-password-reset',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, PortalBrandHeader, PortalFooter],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-password-reset.component.html'
})
export class PortalPasswordResetComponent {
    private readonly authApi = inject(PortalAuthApi);

    readonly step = signal<ResetStep>('request');
    readonly busy = signal(false);
    readonly submitted = signal(false);
    readonly error = signal<string | null>(null);
    readonly resend = new PortalResendTimer(inject(DestroyRef));

    readonly codeSentMessage = RESET_CODE_SENT_MESSAGE;
    readonly passwordHint = PORTAL_PASSWORD_HINT;
    readonly mismatchMessage = PORTAL_PASSWORD_MISMATCH_MESSAGE;

    readonly email = new FormControl('', { nonNullable: true, validators: portalEmailValidators });
    readonly requestForm = new FormGroup({ email: this.email });
    readonly confirmForm = new FormGroup(
        {
            code: new FormControl('', { nonNullable: true, validators: [Validators.required, portalOneTimeCodeValidator()] }),
            newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, portalStrongPasswordValidator()] }),
            confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required })
        },
        { validators: portalPasswordsMatch('newPassword', 'confirmPassword') }
    );

    emailError(): string | null {
        return this.submitted() || this.email.touched ? portalFieldError(this.email.errors, 'email') : null;
    }

    fieldError(name: 'code' | 'newPassword'): string | null {
        const control = this.confirmForm.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
        }

        return portalFieldError(control.errors, name === 'code' ? 'code' : 'password');
    }

    showMismatch(): boolean {
        return (this.submitted() || this.confirmForm.controls.confirmPassword.touched) && this.confirmForm.hasError('passwordMismatch');
    }

    requestCode(): void {
        this.submitted.set(true);
        this.email.markAsTouched();

        if (this.email.invalid || this.busy() || !this.resend.canSend()) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        this.authApi.requestPasswordReset(this.email.value.trim()).subscribe({
            next: () => {
                this.busy.set(false);
                this.submitted.set(false);
                this.step.set('confirm');
                this.resend.start();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err));
            }
        });
    }

    confirm(): void {
        this.submitted.set(true);
        this.confirmForm.markAllAsTouched();

        if (this.confirmForm.invalid || this.busy()) {
            return;
        }

        const { code, newPassword } = this.confirmForm.getRawValue();

        this.busy.set(true);
        this.error.set(null);
        this.authApi.confirmPasswordReset(this.email.value.trim(), normalizeOneTimeCode(code), newPassword).subscribe({
            next: () => {
                this.busy.set(false);
                this.step.set('done');
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err, RESET_ERROR_OVERRIDES));
            }
        });
    }

    changeEmail(): void {
        this.step.set('request');
        this.error.set(null);
        this.confirmForm.reset();
    }
}
