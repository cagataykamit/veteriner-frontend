import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationFieldErrors, type FieldErrors } from '@/app/shared/utils/validation-error-parse.utils';
import {
    getPasswordPolicyErrorMessage,
    getStrongPasswordValidationErrors,
    PASSWORD_ERROR_MESSAGES,
    PASSWORD_POLICY_HINT
} from '@/app/core/validation/password-policy.util';
import { PasswordResetService } from '@/app/pages/auth/password-reset.service';

const CONFIRM_RESET_FALLBACK = 'İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.';
const INVALID_LINK_MESSAGE = 'Şifre sıfırlama bağlantısı geçersiz veya eksik.';
const TOKEN_ERROR_MESSAGE = 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.';
const RATE_LIMIT_MESSAGE = 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
const RESET_SUCCESS_MESSAGE = 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.';

type ResetPasswordFieldKey = 'newPassword';

const RESET_PASSWORD_FIELD_MAP: Record<string, ResetPasswordFieldKey> = {
    newpassword: 'newPassword'
};

@Component({
    selector: 'app-reset-password-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, PasswordModule, RippleModule, RouterLink],
    template: `
        <div class="public-page public-auth-page">
            <div class="public-auth-shell">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner">
                        <div class="public-auth-header">
                            <img
                                [src]="brand.logoFull"
                                alt="Vetinity"
                                class="public-auth-logo dark:hidden"
                                width="120"
                                height="30"
                            />
                            <img
                                [src]="brand.logoFullDark"
                                alt="Vetinity"
                                class="public-auth-logo hidden dark:block"
                                width="120"
                                height="30"
                            />
                            @if (submitted()) {
                                <div class="public-auth-title">Şifre güncellendi</div>
                                <span class="public-auth-subtitle">{{ resetSuccessMessage }}</span>
                            } @else if (!token()) {
                                <div class="public-auth-title">Geçersiz bağlantı</div>
                                <span class="public-auth-subtitle">{{ invalidLinkMessage }}</span>
                            } @else {
                                <div class="public-auth-title">Yeni şifre belirle</div>
                                <span class="public-auth-subtitle">Hesabınız için yeni bir şifre oluşturun.</span>
                            }
                        </div>

                        @if (submitted()) {
                            <div class="public-auth-form">
                                <p-button label="Giriş yap" styleClass="w-full public-auth-submit" (onClick)="goToLogin()"></p-button>
                            </div>
                        } @else if (!token()) {
                            <div class="public-auth-form">
                                <p-button
                                    label="Giriş sayfasına dön"
                                    styleClass="w-full public-auth-submit"
                                    (onClick)="goToLogin()"
                                ></p-button>
                            </div>
                        } @else {
                            <form class="public-auth-form" (ngSubmit)="onSubmit(resetForm)" autocomplete="on" #resetForm="ngForm">
                                <div class="public-auth-field-primary">
                                    <label for="newPassword" class="public-auth-label-password">Yeni şifre</label>
                                    <p class="text-muted-color text-xs m-0 mb-2">{{ passwordPolicyHint }}</p>
                                    <p-password
                                        inputId="newPassword"
                                        name="newPassword"
                                        #newPasswordCtrl="ngModel"
                                        [(ngModel)]="newPassword"
                                        placeholder="En az 8 karakter"
                                        [toggleMask]="true"
                                        [fluid]="true"
                                        [feedback]="false"
                                        [required]="true"
                                    ></p-password>
                                    @if (apiFieldErrors().newPassword) {
                                        <small class="text-red-500 block mt-2">{{ apiFieldErrors().newPassword }}</small>
                                    } @else if (newPasswordCtrl.invalid && (newPasswordCtrl.touched || formSubmitAttempted())) {
                                        @if (passwordPolicyErrorMessage(newPasswordCtrl.errors); as msg) {
                                            <small class="text-red-500 block mt-2">{{ msg }}</small>
                                        }
                                    }
                                </div>

                                <div class="public-auth-field-before-action">
                                    <label for="confirmPassword" class="public-auth-label-password">Yeni şifre (tekrar)</label>
                                    <p-password
                                        inputId="confirmPassword"
                                        name="confirmPassword"
                                        #confirmPasswordCtrl="ngModel"
                                        [(ngModel)]="confirmPassword"
                                        placeholder="Şifrenizi tekrar girin"
                                        [toggleMask]="true"
                                        [fluid]="true"
                                        [feedback]="false"
                                        [required]="true"
                                    ></p-password>
                                    @if (confirmPasswordCtrl.invalid && (confirmPasswordCtrl.touched || formSubmitAttempted())) {
                                        @if (confirmPasswordCtrl.errors?.['required']) {
                                            <small class="text-red-500 block mt-2">Şifre tekrarı zorunlu</small>
                                        }
                                    } @else if (passwordMismatch() && (confirmPasswordCtrl.touched || formSubmitAttempted())) {
                                        <small class="text-red-500 block mt-2">{{ passwordMismatchMessage }}</small>
                                    }
                                </div>

                                <p-button
                                    type="submit"
                                    label="Şifreyi güncelle"
                                    styleClass="w-full public-auth-submit"
                                    [loading]="loading()"
                                    [disabled]="loading()"
                                ></p-button>

                                @if (formError()) {
                                    <div class="public-auth-alert" role="alert" aria-live="assertive">
                                        <div class="public-auth-alert-box">
                                            <i class="pi pi-info-circle shrink-0 text-[0.6875rem] text-red-600/75 dark:text-red-400/70" aria-hidden="true"></i>
                                            <span class="public-auth-alert-text">{{ formError() }}</span>
                                        </div>
                                    </div>
                                }

                                <div class="public-auth-footer-link">
                                    <a routerLink="/auth/login" class="public-brand-link no-underline text-sm">Giriş sayfasına dön</a>
                                </div>
                            </form>
                        }
                    </div>
                </div>
            </div>
        </div>
    `
})
export class ResetPasswordPageComponent implements OnInit {
    readonly brand = VETINITY_BRAND_LOGOS;
    readonly invalidLinkMessage = INVALID_LINK_MESSAGE;
    readonly resetSuccessMessage = RESET_SUCCESS_MESSAGE;
    readonly passwordPolicyHint = PASSWORD_POLICY_HINT;
    readonly passwordMismatchMessage = PASSWORD_ERROR_MESSAGES.passwordMismatch;
    readonly passwordPolicyErrorMessage = getPasswordPolicyErrorMessage;

    private readonly passwordReset = inject(PasswordResetService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    newPassword = '';
    confirmPassword = '';

    readonly token = signal<string | null>(null);
    readonly loading = signal(false);
    readonly submitted = signal(false);
    readonly formSubmitAttempted = signal(false);
    readonly passwordMismatch = signal(false);
    readonly apiFieldErrors = signal<FieldErrors<ResetPasswordFieldKey>>({});
    readonly formError = signal<string | null>(null);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, {
            title: 'Şifre sıfırla — Vetinity',
            description: 'Vetinity hesabınız için yeni şifre belirleyin.',
            noindex: true
        });
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
        const rawToken = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
        this.token.set(rawToken || null);
    }

    goToLogin(): void {
        void this.router.navigate(['/auth/login']);
    }

    onSubmit(resetForm: NgForm): void {
        if (this.loading() || !this.token()) {
            return;
        }
        this.formSubmitAttempted.set(true);
        this.formError.set(null);
        this.apiFieldErrors.set({});
        this.passwordMismatch.set(false);
        if (resetForm.invalid) {
            resetForm.control.markAllAsTouched();
            return;
        }
        const policyErrors = getStrongPasswordValidationErrors(this.newPassword);
        if (policyErrors) {
            resetForm.controls['newPassword']?.setErrors(policyErrors);
            resetForm.controls['newPassword']?.markAsTouched();
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.passwordMismatch.set(true);
            resetForm.controls['confirmPassword']?.markAsTouched();
            return;
        }
        this.loading.set(true);
        this.passwordReset
            .confirmReset(this.token()!, this.newPassword)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: () => {
                    this.submitted.set(true);
                },
                error: (err: unknown) => {
                    const http = err instanceof HttpErrorResponse ? err : null;
                    if (http) {
                        this.handleHttpError(http);
                        return;
                    }
                    this.formError.set(CONFIRM_RESET_FALLBACK);
                }
            });
    }

    private handleHttpError(http: HttpErrorResponse): void {
        const fieldErrors = parseValidationFieldErrors<ResetPasswordFieldKey>(http.error, {
            fieldMap: RESET_PASSWORD_FIELD_MAP
        });
        if (Object.keys(fieldErrors).length > 0) {
            this.apiFieldErrors.set(fieldErrors);
            this.formError.set(null);
            return;
        }
        this.apiFieldErrors.set({});
        this.formError.set(this.resolveError(http));
    }

    private resolveError(http: HttpErrorResponse): string {
        if (http.status === 401) {
            return TOKEN_ERROR_MESSAGE;
        }
        if (http.status === 429) {
            return RATE_LIMIT_MESSAGE;
        }
        return messageFromHttpError(http, CONFIRM_RESET_FALLBACK);
    }
}
