import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
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
        <div class="public-page bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center w-full max-w-3xl px-4">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20">
                        <div class="text-center mb-8">
                            <img
                                [src]="brand.logoFull"
                                alt="Vetinity"
                                class="mx-auto mb-6 h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:hidden"
                                width="120"
                                height="30"
                            />
                            <img
                                [src]="brand.logoFullDark"
                                alt="Vetinity"
                                class="mx-auto mb-6 hidden h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:block"
                                width="120"
                                height="30"
                            />
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Vetinity paneline giriş</div>
                            <span class="text-muted-color font-medium">Hesabınızla giriş yapın</span>
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

                        <div>
                            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">E-posta</label>
                            <input pInputText id="email1" type="text" placeholder="E-posta adresiniz" class="w-full md:w-120 mb-8" [(ngModel)]="email" />

                            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Şifre</label>
                            <p-password
                                inputId="password1"
                                [(ngModel)]="password"
                                placeholder="Şifreniz"
                                [toggleMask]="true"
                                styleClass="mb-4"
                                [fluid]="true"
                                [feedback]="false"
                            ></p-password>

                            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                <div class="flex items-center">
                                    <p-checkbox [(ngModel)]="checked" inputId="rememberme1" binary class="mr-2"></p-checkbox>
                                    <label for="rememberme1">Beni hatırla</label>
                                </div>
                                <span class="font-medium no-underline ml-2 text-right cursor-pointer public-brand-link">Şifremi unuttum</span>
                            </div>
                            <p-button
                                label="Giriş yap"
                                styleClass="w-full public-auth-submit"
                                [loading]="signInLoading()"
                                [disabled]="signInLoading()"
                                (onClick)="signIn()"
                            ></p-button>
                            <div class="text-center mt-4">
                                <a routerLink="/pricing" class="public-brand-link no-underline text-sm">Hesap oluştur</a>
                            </div>
                            @if (loginError()) {
                                <div class="flex justify-center w-full mt-3 mb-0">
                                    <div
                                        class="inline-flex items-center justify-center gap-1.5 max-w-max rounded-sm border-l-[3px] border-l-red-400/75 bg-red-500/[0.06] py-1.5 pl-2.5 pr-2.5 text-center dark:border-l-red-500/45 dark:bg-red-500/[0.08]"
                                        role="alert"
                                        aria-live="assertive"
                                    >
                                        <i
                                            class="pi pi-info-circle shrink-0 text-[0.6875rem] text-red-600/75 dark:text-red-400/70"
                                            aria-hidden="true"
                                        ></i>
                                        <span class="text-sm font-medium leading-tight text-red-950 dark:text-red-100">{{
                                            loginError()
                                        }}</span>
                                    </div>
                                </div>
                            }
                        </div>
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

    signIn(): void {
        if (this.signInLoading()) {
            return;
        }
        this.loginError.set(null);
        this.sessionRenewHint.set(null);
        this.inviteLoginHint.set(null);
        const email = this.email?.trim() ?? '';
        if (!email || !this.password) {
            this.loginError.set('E-posta ve şifre zorunludur.');
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
                    this.resolveClinicStepAfterLogin();
                },
                error: (err: unknown) => {
                    const http = err instanceof HttpErrorResponse ? err : null;
                    if (http) {
                        this.loginError.set(loginFailureMessage(http));
                        return;
                    }
                    this.loginError.set('Giriş başarısız.');
                }
            });
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
