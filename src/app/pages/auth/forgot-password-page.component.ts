import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { PublicAuthShellComponent } from '@/app/pages/public/components/public-auth-shell.component';
import { setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationFieldErrors, type FieldErrors } from '@/app/shared/utils/validation-error-parse.utils';
import { PasswordResetService } from '@/app/pages/auth/password-reset.service';

const REQUEST_RESET_FALLBACK = 'İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.';
const REQUEST_RESET_SUCCESS_MESSAGE = 'Eğer bu e-posta adresi sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';
const RATE_LIMIT_MESSAGE = 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';

type ForgotPasswordFieldKey = 'email';

const FORGOT_PASSWORD_FIELD_MAP: Record<string, ForgotPasswordFieldKey> = {
    email: 'email'
};

@Component({
    selector: 'app-forgot-password-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, RippleModule, RouterLink, PublicAuthShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-auth-shell>
            @if (submitted()) {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">E-posta gönderildi</h1>
                    <p class="public-auth-subtitle">{{ successMessage }}</p>
                </div>
                <div class="public-auth-form">
                    <button pButton type="button" class="w-full public-auth-submit" (click)="goToLogin()">Giriş sayfasına dön</button>
                </div>
            } @else {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">Şifremi unuttum</h1>
                    <p class="public-auth-subtitle">E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.</p>
                </div>

                <form class="public-auth-form" (ngSubmit)="onSubmit(forgotForm)" autocomplete="on" #forgotForm="ngForm">
                    <div class="public-auth-field-before-action">
                        <label for="forgotEmail" class="public-auth-label">E-posta</label>
                        <input pInputText id="forgotEmail" type="email" name="email" #emailCtrl="ngModel" placeholder="E-posta adresiniz" class="public-auth-control" [(ngModel)]="email" required email />
                        @if (apiFieldErrors().email) {
                            <small class="text-danger block mt-2">{{ apiFieldErrors().email }}</small>
                        } @else if (emailCtrl.invalid && (emailCtrl.touched || formSubmitAttempted())) {
                            @if (emailCtrl.errors?.['required']) {
                                <small class="text-danger block mt-2">E-posta zorunlu</small>
                            } @else if (emailCtrl.errors?.['email']) {
                                <small class="text-danger block mt-2">Geçerli bir e-posta girin</small>
                            }
                        }
                    </div>

                    <button pButton type="submit" class="w-full public-auth-submit" [disabled]="loading()">@if (loading()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Sıfırlama bağlantısı gönder</button>

                    @if (formError()) {
                        <div class="public-auth-alert" role="alert" aria-live="assertive">
                            <div class="public-auth-alert-box">
                                <i class="pi pi-info-circle shrink-0 public-auth-alert-text" aria-hidden="true"></i>
                                <span class="public-auth-alert-text">{{ formError() }}</span>
                            </div>
                        </div>
                    }

                    <p class="public-auth-alt">
                        <a routerLink="/auth/login" class="public-auth-link"><i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>Giriş sayfasına dön</a>
                    </p>
                </form>
            }
        </app-public-auth-shell>
    `
})
export class ForgotPasswordPageComponent implements OnInit {
    readonly successMessage = REQUEST_RESET_SUCCESS_MESSAGE;

    private readonly passwordReset = inject(PasswordResetService);
    private readonly router = inject(Router);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    email = '';

    readonly loading = signal(false);
    readonly submitted = signal(false);
    readonly formSubmitAttempted = signal(false);
    readonly apiFieldErrors = signal<FieldErrors<ForgotPasswordFieldKey>>({});
    readonly formError = signal<string | null>(null);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, {
            title: 'Şifremi unuttum — Vetinity',
            description: 'Vetinity hesabınız için şifre sıfırlama bağlantısı isteyin.',
            noindex: true
        });
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
    }

    goToLogin(): void {
        void this.router.navigate(['/auth/login']);
    }

    onSubmit(forgotForm: NgForm): void {
        if (this.loading()) {
            return;
        }

        this.formSubmitAttempted.set(true);
        this.formError.set(null);
        this.apiFieldErrors.set({});

        if (forgotForm.invalid) {
            forgotForm.control.markAllAsTouched();

            return;
        }

        const trimmedEmail = this.email?.trim() ?? '';

        if (!trimmedEmail) {
            forgotForm.controls['email']?.setErrors({ required: true });
            forgotForm.controls['email']?.markAsTouched();

            return;
        }

        this.loading.set(true);
        this.passwordReset
            .requestReset(trimmedEmail)
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

                    this.formError.set(REQUEST_RESET_FALLBACK);
                }
            });
    }

    private handleHttpError(http: HttpErrorResponse): void {
        const fieldErrors = parseValidationFieldErrors<ForgotPasswordFieldKey>(http.error, {
            fieldMap: FORGOT_PASSWORD_FIELD_MAP
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
        if (http.status === 429) {
            return RATE_LIMIT_MESSAGE;
        }

        return messageFromHttpError(http, REQUEST_RESET_FALLBACK);
    }
}
