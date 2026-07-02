import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import type { PublicOwnerSignupRequestDto, PublicOwnerSignupResultDto } from '@/app/features/public/models/public-owner-signup-api.model';
import { PublicOwnerSignupService } from '@/app/features/public/services/public-owner-signup.service';
import { publicOwnerSignupFailureMessage } from '@/app/features/public/utils/public-owner-signup-error.utils';
import { resolveSignupPlan, defByApiCode, type PricingPlanDef } from '@/app/features/public/utils/pricing-plan.utils';
import { AUTH_SIGNUP_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import {
    PASSWORD_POLICY_HINT,
    validateStrongPasswordValue
} from '@/app/core/validation/password-policy.util';

@Component({
    selector: 'app-owner-signup-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, RippleModule, RouterLink],
    template: `
        <div class="public-page bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden py-8">
            <div class="flex flex-col items-center justify-center w-full max-w-3xl px-4">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner w-full bg-surface-0 dark:bg-surface-900 py-12 px-8 sm:px-16">
                        @if (successResult(); as res) {
                            <div class="text-center mb-6">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex mb-6">
                                    <img
                                        [src]="brand.logoFull"
                                        alt="Vetinity"
                                        class="h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:hidden"
                                        width="120"
                                        height="30"
                                    />
                                    <img
                                        [src]="brand.logoFullDark"
                                        alt="Vetinity"
                                        class="hidden h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:block"
                                        width="120"
                                        height="30"
                                    />
                                </a>
                                <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-2">Kayıt tamamlandı</div>
                                <span class="text-muted-color font-medium">Deneme süreniz başladı. Aşağıdaki tarihlerle giriş yapabilirsiniz.</span>
                            </div>
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-6 text-left">
                                <div class="text-sm text-muted-color mb-1">Seçilen plan</div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ successPlanTitle(res) }}</div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div class="text-muted-color mb-1">Deneme başlangıcı</div>
                                        <div class="font-medium">{{ formatDate(res.trialStartsAtUtc) }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Deneme bitişi</div>
                                        <div class="font-medium">{{ formatDate(res.trialEndsAtUtc) }}</div>
                                    </div>
                                </div>
                            </div>
                            <p-button label="Giriş yap" styleClass="w-full mb-4 public-auth-submit" (onClick)="goToLogin()" />
                            <div class="text-center">
                                <a routerLink="/pricing" class="public-brand-link no-underline text-sm">Paketlere dön</a>
                            </div>
                        } @else {
                            <div class="text-center mb-8">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex mb-6">
                                    <img
                                        [src]="brand.logoFull"
                                        alt="Vetinity"
                                        class="h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:hidden"
                                        width="120"
                                        height="30"
                                    />
                                    <img
                                        [src]="brand.logoFullDark"
                                        alt="Vetinity"
                                        class="hidden h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:block"
                                        width="120"
                                        height="30"
                                    />
                                </a>
                                <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-2">Hesap oluştur</div>
                                <span class="text-muted-color font-medium">Deneme paketiyle işletmenizi tek adımda başlatın</span>
                            </div>

                            <div class="flex flex-col gap-6">
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                                    <div class="text-xs text-muted-color uppercase tracking-wide mb-1">Seçilen paket</div>
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-lg mb-2">{{ selectedPlan().title }}</div>
                                    <p class="text-sm text-muted-color m-0 mb-3">{{ selectedPlan().description }}</p>
                                    <p class="text-sm text-muted-color m-0 mb-3">
                                        Deneme paketiyle başlayın. İsterseniz paketleri inceleyerek farklı bir planla devam edebilirsiniz.
                                    </p>
                                    <a routerLink="/pricing" class="public-brand-link no-underline text-sm">Paketleri inceleyin</a>
                                </div>

                                <div>
                                    <label for="tenantName" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Klinik / işletme adı *</label>
                                    <input pInputText id="tenantName" type="text" class="w-full" [(ngModel)]="tenantName" autocomplete="organization" />
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="clinicName" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">İlk klinik adı *</label>
                                        <input pInputText id="clinicName" type="text" class="w-full" [(ngModel)]="clinicName" autocomplete="organization" />
                                    </div>
                                    <div>
                                        <label for="clinicCity" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Şehir *</label>
                                        <input pInputText id="clinicCity" type="text" class="w-full" [(ngModel)]="clinicCity" autocomplete="address-level2" />
                                    </div>
                                </div>

                                <div>
                                    <label for="email" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Yetkili e-posta *</label>
                                    <input pInputText id="email" type="email" class="w-full" [(ngModel)]="email" autocomplete="email" />
                                </div>

                                <div>
                                    <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Şifre *</label>
                                    <p class="text-sm text-muted-color m-0 mb-2">{{ passwordPolicyHint }}</p>
                                    <p-password
                                        id="password"
                                        [(ngModel)]="password"
                                        placeholder="Şifre"
                                        [toggleMask]="true"
                                        styleClass="w-full"
                                        [fluid]="true"
                                        [feedback]="false"
                                    />
                                    @if (passwordFieldError()) {
                                        <small class="text-red-500 block mt-2">{{ passwordFieldError() }}</small>
                                    }
                                </div>

                                <p class="text-sm text-muted-color m-0">
                                    Bu adımda ödeme alınmaz; deneme süresi kurum aboneliğinde başlatılır. Paket değişimi ve ödeme sonraki fazda
                                    eklenecektir.
                                </p>

                                <p-button
                                    label="Hesabı oluştur"
                                    styleClass="w-full public-auth-submit"
                                    [loading]="submitting()"
                                    [disabled]="submitting()"
                                    (onClick)="submit()"
                                />

                                @if (formError()) {
                                    <div
                                        class="rounded-sm border-l-[3px] border-l-red-400/75 bg-red-500/[0.06] py-2 px-3 dark:border-l-red-500/45 dark:bg-red-500/[0.08]"
                                        role="alert"
                                        aria-live="assertive"
                                    >
                                        <span class="text-sm font-medium text-red-950 dark:text-red-100">{{ formError() }}</span>
                                    </div>
                                }

                                <div class="text-center flex flex-col gap-2">
                                    <a routerLink="/auth/login" class="public-brand-link no-underline">Zaten hesabınız var mı? Giriş yapın</a>
                                    <a routerLink="/pricing" class="text-muted-color font-medium no-underline text-sm">Paketlere dön</a>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    `
})
export class OwnerSignupPageComponent implements OnInit {
    readonly brand = VETINITY_BRAND_LOGOS;

    private readonly signup = inject(PublicOwnerSignupService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly selectedPlan = signal<PricingPlanDef>(resolveSignupPlan(null));
    readonly successResult = signal<PublicOwnerSignupResultDto | null>(null);
    /** Success sonrası login prefill için saklanır. */
    private readonly loginEmailAfterSuccess = signal<string>('');

    tenantName = '';
    clinicName = '';
    clinicCity = '';
    email = '';
    password = '';

    readonly submitting = signal(false);
    readonly formError = signal<string | null>(null);
    readonly passwordFieldError = signal<string | null>(null);
    readonly passwordPolicyHint = PASSWORD_POLICY_HINT;

    readonly formatDate = (v: string | null | undefined) => formatDateDisplay(v);

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, AUTH_SIGNUP_PAGE_META);
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
            if (this.successResult()) {
                return;
            }
            this.selectedPlan.set(resolveSignupPlan(q.get('plan')));
        });
    }

    submit(): void {
        if (this.submitting()) {
            return;
        }
        this.formError.set(null);
        this.passwordFieldError.set(null);

        const plan = this.selectedPlan();

        const tenantName = this.tenantName?.trim() ?? '';
        const clinicName = this.clinicName?.trim() ?? '';
        const clinicCity = this.clinicCity?.trim() ?? '';
        const email = this.email?.trim() ?? '';
        const password = this.password ?? '';

        if (!tenantName || !clinicName || !clinicCity || !email || !password) {
            this.formError.set('Tüm zorunlu alanları doldurun.');
            if (!password) {
                this.passwordFieldError.set(validateStrongPasswordValue(''));
            }
            return;
        }

        const passwordPolicyError = validateStrongPasswordValue(password);
        if (passwordPolicyError) {
            this.passwordFieldError.set(passwordPolicyError);
            return;
        }

        const body: PublicOwnerSignupRequestDto = {
            planCode: plan.apiCode,
            tenantName,
            clinicName,
            clinicCity,
            email,
            password
        };

        this.submitting.set(true);
        this.signup
            .signup(body)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
                next: (res) => {
                    this.loginEmailAfterSuccess.set(email);
                    this.successResult.set(res);
                },
                error: (err: unknown) => {
                    this.formError.set(publicOwnerSignupFailureMessage(err));
                }
            });
    }

    successPlanTitle(res: PublicOwnerSignupResultDto): string {
        return defByApiCode(res.planCode)?.title ?? res.planCode;
    }

    goToLogin(): void {
        const email = this.loginEmailAfterSuccess().trim();
        void this.router.navigate(['/auth/login'], {
            queryParams: {
                registered: '1',
                ...(email ? { email } : {})
            }
        });
    }
}
