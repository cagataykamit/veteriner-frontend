import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { RouterLink } from '@angular/router';
import { AuthService, type ClinicResolutionDecision } from '@/app/core/auth/auth.service';
import {
    AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE,
    authFailureMessage,
    loginFailureMessage
} from '@/app/core/auth/auth-error.utils';
import { panelReturnUrlOrDefault } from '@/app/core/auth/auth-return-url.utils';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AUTH_LOGIN_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationFieldErrors, type FieldErrors } from '@/app/shared/utils/validation-error-parse.utils';

const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'E-posta veya şifre hatalı.';

type LoginFieldKey = 'email' | 'password';

const LOGIN_VALIDATION_FIELD_MAP: Record<string, LoginFieldKey> = {
    email: 'email',
    password: 'password'
};

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        PasswordModule,
        FormsModule,
        RippleModule,
        RouterLink
    ],
    template: `
        <div class="public-page public-auth-page">
            <div class="public-auth-shell">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner">
                        <div class="public-auth-header">
                            <img
                                [src]="brand.logoFull"
                                alt="Vetinity"
                                class="public-auth-logo block dark:hidden"
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
                            <div class="public-auth-title">Vetinity paneline giriş</div>
                            <span class="public-auth-subtitle">Hesabınızla giriş yapın</span>
                            @if (sessionRenewHint()) {
                                <p class="mt-4 mb-0 mx-auto max-w-md text-center text-sm font-medium public-brand-link" role="status">
                                    {{ sessionRenewHint() }}
                                </p>
                            }
                            @if (registeredHint()) {
                                <p class="mt-4 mb-0 mx-auto max-w-md text-center text-sm font-medium public-brand-link" role="status">
                                    {{ registeredHint() }}
                                </p>
                            }
                            @if (inviteAcceptedHint()) {
                                <p class="mt-4 mb-0 mx-auto max-w-md text-center text-sm font-medium public-brand-link" role="status">
                                    {{ inviteAcceptedHint() }}
                                </p>
                            }
                            @if (inviteLoginHint()) {
                                <p class="mt-4 mb-0 mx-auto max-w-md text-center text-sm font-medium public-brand-link" role="status">
                                    {{ inviteLoginHint() }}
                                </p>
                            }
                        </div>

                        <form (ngSubmit)="onSubmit(loginForm)" autocomplete="on" #loginForm="ngForm" class="public-auth-form">
                            <div class="public-auth-field-primary">
                                <label for="email1" class="public-auth-label">E-posta</label>
                                <input
                                    pInputText
                                    id="email1"
                                    type="email"
                                    name="email"
                                    #emailCtrl="ngModel"
                                    placeholder="E-posta adresiniz"
                                    class="public-auth-control"
                                    [(ngModel)]="email"
                                    required
                                    email
                                />
                                @if (apiFieldErrors().email) {
                                    <small class="text-red-500 block mt-2">{{ apiFieldErrors().email }}</small>
                                } @else if (emailCtrl.invalid && (emailCtrl.touched || formSubmitAttempted())) {
                                    @if (emailCtrl.errors?.['required']) {
                                        <small class="text-red-500 block mt-2">E-posta zorunlu</small>
                                    } @else if (emailCtrl.errors?.['email']) {
                                        <small class="text-red-500 block mt-2">Geçerli bir e-posta girin</small>
                                    }
                                }
                            </div>

                            <div class="public-auth-field-secondary">
                                <label for="password1" class="public-auth-label-password">Şifre</label>
                                <p-password
                                    inputId="password1"
                                    name="password"
                                    #passwordCtrl="ngModel"
                                    [(ngModel)]="password"
                                    placeholder="Şifreniz"
                                    [toggleMask]="true"
                                    [fluid]="true"
                                    [feedback]="false"
                                    [required]="true"
                                ></p-password>
                                @if (apiFieldErrors().password) {
                                    <small class="text-red-500 block mt-2">{{ apiFieldErrors().password }}</small>
                                } @else if (passwordCtrl.invalid && (passwordCtrl.touched || formSubmitAttempted())) {
                                    @if (passwordCtrl.errors?.['required']) {
                                        <small class="text-red-500 block mt-2">Şifre zorunlu</small>
                                    }
                                }
                            </div>

                            <div class="public-auth-options-row">
                                <div class="flex items-center">
                                    <p-checkbox [(ngModel)]="checked" name="rememberMe" inputId="rememberme1" binary class="mr-2"></p-checkbox>
                                    <label for="rememberme1">Beni hatırla</label>
                                </div>
                                <a routerLink="/auth/forgot-password" class="font-medium no-underline ml-2 text-right cursor-pointer public-brand-link">Şifremi unuttum</a>
                            </div>
                            <p-button
                                type="submit"
                                label="Giriş yap"
                                styleClass="w-full public-auth-submit"
                                [loading]="signInLoading()"
                                [disabled]="signInLoading()"
                            ></p-button>
                            @if (loginError()) {
                                <div class="public-auth-alert" role="alert" aria-live="assertive">
                                    <div class="public-auth-alert-box">
                                        <i class="pi pi-info-circle shrink-0 text-[0.6875rem] text-red-600/75 dark:text-red-400/70" aria-hidden="true"></i>
                                        <span class="public-auth-alert-text">{{ loginError() }}</span>
                                    </div>
                                </div>
                            }
                            <div class="public-auth-footer-link">
                                <a routerLink="/pricing" class="public-brand-link no-underline text-sm">Hesap oluştur</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login implements OnInit {
    readonly brand = VETINITY_BRAND_LOGOS;

    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    email: string = '';

    password: string = '';

    checked: boolean = false;

    readonly signInLoading = signal(false);

    readonly formSubmitAttempted = signal(false);

    readonly apiFieldErrors = signal<FieldErrors<LoginFieldKey>>({});

    readonly loginError = signal<string | null>(null);

    /** Yenileme başarısız / ikinci 401 sonrası interceptor `reauth=1` ile yönlendirir. */
    readonly sessionRenewHint = signal<string | null>(null);

    /** Public owner-signup sonrası `registered=1` ile gösterilir. */
    readonly registeredHint = signal<string | null>(null);

    /** Invite signup-and-accept sonrası `inviteAccepted=1`. */
    readonly inviteAcceptedHint = signal<string | null>(null);

    /** `inviteToken` query ile gelen davet akışı. */
    readonly inviteLoginHint = signal<string | null>(null);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, AUTH_LOGIN_PAGE_META);
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
        const q = this.route.snapshot.queryParamMap;
        if (q.get('reauth') === '1') {
            this.sessionRenewHint.set('Oturum süresi doldu veya oturum yenilenemedi. Lütfen tekrar giriş yapın.');
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { reauth: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        }
        if (q.get('registered') === '1') {
            this.registeredHint.set('Kayıt tamamlandı. E-posta ve şifrenizle giriş yapabilirsiniz.');
            const prefillEmail = q.get('email')?.trim();
            if (prefillEmail) {
                this.email = prefillEmail;
            }
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { registered: null, email: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        }
        if (q.get('inviteAccepted') === '1') {
            this.inviteAcceptedHint.set('Davet için hesabınız hazır. Giriş yaparak devam edebilirsiniz.');
            const prefillEmail = q.get('email')?.trim();
            if (prefillEmail) {
                this.email = prefillEmail;
            }
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { inviteAccepted: null, email: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        }
        if (q.get('inviteToken')?.trim()) {
            this.inviteLoginHint.set('Daveti tamamlamak için davet edilen e-posta adresiyle giriş yapın.');
            const prefillEmail = q.get('email')?.trim();
            if (prefillEmail) {
                this.email = prefillEmail;
            }
        }
    }

    onSubmit(loginForm: NgForm): void {
        if (this.signInLoading()) {
            return;
        }
        this.formSubmitAttempted.set(true);
        this.loginError.set(null);
        this.apiFieldErrors.set({});
        this.sessionRenewHint.set(null);
        this.inviteLoginHint.set(null);
        if (loginForm.invalid) {
            loginForm.control.markAllAsTouched();
            return;
        }
        const email = this.email?.trim() ?? '';
        if (!email) {
            loginForm.controls['email']?.setErrors({ required: true });
            loginForm.controls['email']?.markAsTouched();
            return;
        }
        this.signInLoading.set(true);
        this.auth
            .login({
                email,
                password: this.password
            })
            .pipe(finalize(() => this.signInLoading.set(false)))
            .subscribe({
                next: () => {
                    if (!this.auth.isAuthenticated()) {
                        this.loginError.set('Sunucu yanıtı geçersiz: oturum anahtarı alınamadı.');
                        return;
                    }
                    this.loginError.set(null);
                    this.resolveClinicStepAfterLogin();
                },
                error: (err: unknown) => {
                    const http = err instanceof HttpErrorResponse ? err : null;
                    if (http) {
                        this.handleLoginHttpError(http);
                        return;
                    }
                    this.loginError.set('Giriş başarısız.');
                }
            });
    }

    private handleLoginHttpError(http: HttpErrorResponse): void {
        const fieldErrors = parseValidationFieldErrors<LoginFieldKey>(http.error, {
            fieldMap: LOGIN_VALIDATION_FIELD_MAP
        });
        if (Object.keys(fieldErrors).length > 0) {
            this.apiFieldErrors.set(fieldErrors);
            this.loginError.set(null);
            return;
        }
        this.apiFieldErrors.set({});
        this.loginError.set(this.resolveLoginHttpError(http));
    }

    private resolveLoginHttpError(http: HttpErrorResponse): string {
        if (http.status === 401) {
            return LOGIN_INVALID_CREDENTIALS_MESSAGE;
        }
        const message = loginFailureMessage(http);
        if (http.status === 400 && this.shouldTreatAsInvalidCredentials(http, message)) {
            return LOGIN_INVALID_CREDENTIALS_MESSAGE;
        }
        return message;
    }

    private shouldTreatAsInvalidCredentials(http: HttpErrorResponse, message: string): boolean {
        if (message === LOGIN_INVALID_CREDENTIALS_MESSAGE) {
            return true;
        }
        const code = problemCodeFromHttpError(http)?.trim() ?? '';
        if (code.startsWith('Auth.Unauthorized.')) {
            return true;
        }
        const normalized = message.toLocaleLowerCase('tr-TR');
        if (/gönderilen bilgiler doğrulanamadı/.test(normalized)) {
            return true;
        }
        if (/aşağıdaki alanları kontrol edin/.test(normalized)) {
            return true;
        }
        return false;
    }

    private resolveClinicStepAfterLogin(): void {
        this.auth.getMyClinics().subscribe({
            next: (clinics) => {
                const decision = this.auth.resolveClinicDecision(clinics);
                if (decision.kind === 'none') {
                    this.loginError.set(AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE);
                    return;
                }
                if (decision.kind === 'single') {
                    this.autoSelectSingleClinic(decision.clinic);
                    return;
                }
                this.navigateToSelectClinic(decision, clinics);
            },
            error: (err: unknown) => {
                const http = err instanceof HttpErrorResponse ? err : null;
                this.loginError.set(http ? authFailureMessage(http, 'Klinikler yüklenemedi.') : 'Klinikler yüklenemedi.');
            }
        });
    }

    private autoSelectSingleClinic(clinic: ClinicSummary): void {
        this.signInLoading.set(true);
        this.auth
            .selectClinic(clinic.id, clinic.name)
            .pipe(finalize(() => this.signInLoading.set(false)))
            .subscribe({
                next: () => {
                    const it = this.inviteTokenFromRoute();
                    if (it) {
                        void this.router.navigate(['/join', it]);
                        return;
                    }
                    void this.router.navigateByUrl(this.safeReturnUrl());
                },
                error: (err: unknown) => {
                    const http = err instanceof HttpErrorResponse ? err : null;
                    this.loginError.set(http ? authFailureMessage(http, 'Klinik seçimi yapılamadı.') : 'Klinik seçimi yapılamadı.');
                }
            });
    }

    private safeReturnUrl(): string {
        return panelReturnUrlOrDefault(this.route.snapshot.queryParamMap.get('returnUrl'));
    }

    private inviteTokenFromRoute(): string | null {
        const t = this.route.snapshot.queryParamMap.get('inviteToken')?.trim();
        return t || null;
    }

    private navigateToSelectClinic(decision: ClinicResolutionDecision, clinics: ClinicSummary[]): void {
        if (decision.kind !== 'multiple') {
            return;
        }
        const inviteTok = this.inviteTokenFromRoute();
        void this.router.navigate(['/auth/select-clinic'], {
            queryParams: {
                returnUrl: this.safeReturnUrl(),
                ...(inviteTok ? { inviteToken: inviteTok } : {})
            },
            state: { clinics }
        });
    }
}
