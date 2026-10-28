import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import type { PublicOwnerSignupResultDto } from '@/app/features/public/models/public-owner-signup-api.model';
import { DEFAULT_ONBOARDING_START_MODE, type OnboardingStartMode } from '@/app/features/public/models/public-owner-signup-form.model';
import { mapPublicOwnerSignupFormToRequest } from '@/app/features/public/data/public-owner-signup.mapper';
import { PublicOwnerSignupService } from '@/app/features/public/services/public-owner-signup.service';
import { ExampleClinicSummaryComponent } from '@/app/entities/example-clinic/components/example-clinic-summary.component';
import { publicOwnerSignupFailureMessage } from '@/app/features/public/utils/public-owner-signup-error.utils';
import { resolveSignupPlan, defByApiCode, type PricingPlanDef } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { AUTH_SIGNUP_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { PublicLegalLinksComponent } from '@/app/pages/public/components/public-legal-links.component';
import { LegalConsentCheckboxComponent } from '@/app/features/legal-acceptance/components/legal-consent-checkbox.component';
import type { LegalDocumentVersionDto } from '@/app/entities/legal-document/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { isLegalVersionOutdatedError, LEGAL_ACCEPTANCE_CODE_MESSAGES } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';
import { LEGAL_DOCUMENTS_BY_TYPE, type LegalDocumentType } from '@/app/entities/legal-document/utils/legal-documents.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { PASSWORD_POLICY_HINT, validateStrongPasswordValue } from '@/app/core/validation/password-policy.util';
import { DiscountCodeFieldComponent } from '@/app/entities/sales-partner/components/discount-code-field.component';
import type { DiscountCodeValidationDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { clearPendingDiscountCode, DISCOUNT_CODE_QUERY_PARAM, discountNoteText, normalizeDiscountCodeInput, readPendingDiscountCode } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-owner-signup-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, RadioButtonModule, RippleModule, RouterLink, PublicLegalLinksComponent, LegalConsentCheckboxComponent, DiscountCodeFieldComponent, ExampleClinicSummaryComponent, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="public-page bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden py-8">
            <div class="flex flex-col items-center justify-center w-full max-w-3xl px-4">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner w-full bg-surface-0 dark:bg-surface-900 py-12 px-8 sm:px-16">
                        @if (successResult(); as res) {
                            <div class="text-center mb-6">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex mb-6">
                                    <img [src]="brand.logoFull" alt="Vetinity" class="h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:hidden" width="120" height="30" />
                                    <img [src]="brand.logoFullDark" alt="Vetinity" class="hidden h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:block" width="120" height="30" />
                                </a>
                                <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-2">Kayıt tamamlandı</div>
                                <span class="text-muted-color font-medium">Deneme süreniz başladı. Aşağıdaki tarihlerle giriş yapabilirsiniz.</span>
                            </div>
                            @if (res.exampleClinic; as example) {
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-6 text-left" data-testid="signup-example-clinic-card">
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 mb-1">Yüklenen örnek içerik</div>
                                    <p class="text-sm text-muted-color m-0 mb-3">Örnek Veteriner Kliniği hazır: giriş yapınca Bugün, randevu ve hasta ekranlarını dolu görürsünüz.</p>
                                    <app-example-clinic-summary [summary]="example" />
                                </div>
                            } @else {
                                <p class="text-sm text-muted-color text-left m-0 mb-6" data-testid="signup-empty-clinic-note">Boş klinikle başlıyorsunuz. İsterseniz örnek içeriği daha sonra Ayarlar &gt; Abonelik sayfasından yükleyebilirsiniz.</p>
                            }
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-6 text-left">
                                <div class="text-sm text-muted-color mb-1">Seçilen plan</div>
                                <div class="font-semibold text-surface-900 dark:text-surface-0 mb-4">{{ successPlanTitle(res) }}</div>
                                @if (res.discount; as discount) {
                                    <div class="text-sm mb-4" data-testid="signup-discount-note">
                                        Ortak kodu <span class="font-semibold">{{ discount.code }}</span
                                        >:
                                        {{ discountNote(discount.discountPercent, discount.discountMonths) }}
                                    </div>
                                }
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div class="text-muted-color mb-1">Deneme başlangıcı</div>
                                        <div class="font-medium">{{ res.trialStartsAtUtc | trDate }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Deneme bitişi</div>
                                        <div class="font-medium">{{ res.trialEndsAtUtc | trDate }}</div>
                                    </div>
                                </div>
                            </div>
                            <button pButton type="button" class="w-full mb-4 public-auth-submit" (click)="goToLogin()">Giriş yap</button>
                            <div class="text-center">
                                <a routerLink="/paketler" class="public-brand-link no-underline text-sm">Paketlere dön</a>
                            </div>
                        } @else {
                            <div class="text-center mb-8">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex mb-6">
                                    <img [src]="brand.logoFull" alt="Vetinity" class="h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:hidden" width="120" height="30" />
                                    <img [src]="brand.logoFullDark" alt="Vetinity" class="hidden h-auto w-[5.5rem] sm:w-24 md:w-[7.5rem] dark:block" width="120" height="30" />
                                </a>
                                <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-2">Hesap oluştur</div>
                                <span class="text-muted-color font-medium">Deneme paketiyle işletmenizi tek adımda başlatın</span>
                            </div>

                            <div class="flex flex-col gap-6">
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                                    <div class="text-xs text-muted-color uppercase tracking-wide mb-1">Seçilen paket</div>
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-lg mb-2">{{ selectedPlan().title }}</div>
                                    <p class="text-sm text-muted-color m-0 mb-3">{{ selectedPlan().description }}</p>
                                    <p class="text-sm text-muted-color m-0 mb-3">Deneme paketiyle başlayın. İsterseniz paketleri inceleyerek farklı bir planla devam edebilirsiniz.</p>
                                    <a routerLink="/paketler" class="public-brand-link no-underline text-sm">Paketleri inceleyin</a>
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
                                    <p-password id="password" [(ngModel)]="password" placeholder="Şifre" [toggleMask]="true" class="w-full" [fluid]="true" [feedback]="false" />
                                    @if (passwordFieldError()) {
                                        <small class="text-red-500 block mt-2">{{ passwordFieldError() }}</small>
                                    }
                                </div>

                                <app-discount-code-field inputId="signupDiscountCode" [disabled]="submitting()" [(code)]="discountCode" (validated)="discountValidation.set($event)" />

                                <fieldset class="border-0 p-0 m-0 min-w-0" data-testid="signup-start-mode">
                                    <legend class="block text-surface-900 dark:text-surface-0 font-medium mb-2 p-0">Nasıl başlayalım?</legend>
                                    <div class="flex flex-col gap-3">
                                        <label for="startModeExample" class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors" [class]="startModeCardClass('example')">
                                            <p-radiobutton inputId="startModeExample" name="startMode" value="example" [disabled]="submitting()" [ngModel]="startMode()" (ngModelChange)="startMode.set($event)" />
                                            <span class="min-w-0">
                                                <span class="block font-medium text-surface-900 dark:text-surface-0">Örnek Veteriner Kliniğini yükle <span class="text-primary text-sm font-semibold">(önerilen)</span></span>
                                                <span class="block text-sm text-muted-color mt-1"
                                                    >Müşteri, hasta, randevu, muayene, aşı, ödeme ve stok örnekleriyle dolu bir klinikte ilk dakikadan deneyin. Veriler tamamen sentetiktir, gerçek müşteri verisi içermez ve "ÖRNEK" olarak
                                                    işaretlidir.</span
                                                >
                                            </span>
                                        </label>
                                        <label for="startModeEmpty" class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors" [class]="startModeCardClass('empty')">
                                            <p-radiobutton inputId="startModeEmpty" name="startMode" value="empty" [disabled]="submitting()" [ngModel]="startMode()" (ngModelChange)="startMode.set($event)" />
                                            <span class="min-w-0">
                                                <span class="block font-medium text-surface-900 dark:text-surface-0">Boş klinikle başla</span>
                                                <span class="block text-sm text-muted-color mt-1">Kendi kayıtlarınızı sıfırdan girin. Örnek içeriği daha sonra Ayarlar &gt; Abonelik sayfasından da yükleyebilirsiniz.</span>
                                            </span>
                                        </label>
                                    </div>
                                </fieldset>

                                <p class="text-sm text-muted-color m-0">Bu adımda ödeme alınmaz; deneme süresi kurum aboneliğinde başlatılır. Paket değişimi ve ödeme sonraki fazda eklenecektir.</p>

                                <app-legal-consent-checkbox inputId="signupLegalConsent" [documents]="legalDocumentTypes()" [disabled]="submitting()" [(checked)]="legalConsent" />

                                <button pButton type="button" class="w-full public-auth-submit" [disabled]="submitting() || !legalConsent()" (click)="submit()">@if (submitting()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Hesabı oluştur</button>

                                @if (formError()) {
                                    <div class="rounded-sm border-l-[3px] border-l-red-400/75 bg-red-500/[0.06] py-2 px-3 dark:border-l-red-500/45 dark:bg-red-500/[0.08]" role="alert" aria-live="assertive">
                                        <span class="text-sm font-medium text-red-950 dark:text-red-100">{{ formError() }}</span>
                                    </div>
                                }

                                <div class="text-center flex flex-col gap-2">
                                    <a routerLink="/auth/login" class="public-brand-link no-underline">Zaten hesabınız var mı? Giriş yapın</a>
                                    <a routerLink="/paketler" class="text-muted-color font-medium no-underline text-sm">Paketlere dön</a>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <app-public-legal-links />
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
    private readonly legal = inject(LegalAcceptanceService);

    /** Kayıt olan klinik yöneticisidir: sunucunun yayımladığı tüm belgeler (ADR-029 madde 4). */
    private readonly legalVersions = signal<LegalDocumentVersionDto[] | null>(null);
    readonly legalDocumentTypes = computed<readonly LegalDocumentType[]>(() => this.legalVersions()?.map((v) => v.documentType) ?? (Object.keys(LEGAL_DOCUMENTS_BY_TYPE) as LegalDocumentType[]));
    readonly legalConsent = signal(false);

    readonly selectedPlan = signal<PricingPlanDef>(resolveSignupPlan(null));
    readonly successResult = signal<PublicOwnerSignupResultDto | null>(null);
    /** Success sonrası login prefill için saklanır. */
    private readonly loginEmailAfterSuccess = signal<string>('');

    tenantName = '';
    clinicName = '';
    clinicCity = '';
    email = '';
    password = '';

    /** Satış ortağı kodu (ADR-037): `/r/:kod` bağlantısından (URL `kod` ya da oturum belleği) gelir ya da elle girilir. */
    readonly discountCode = signal(normalizeDiscountCodeInput(this.route.snapshot.queryParamMap.get(DISCOUNT_CODE_QUERY_PARAM) ?? readPendingDiscountCode()));
    readonly discountValidation = signal<DiscountCodeValidationDto | null>(null);
    readonly discountNote = discountNoteText;

    /** "Nasıl başlayalım?" — örnek klinik önerilen ve varsayılan (ADR-002). */
    readonly startMode = signal<OnboardingStartMode>(DEFAULT_ONBOARDING_START_MODE);

    startModeCardClass(mode: OnboardingStartMode): string {
        return this.startMode() === mode ? 'border-primary' : 'border-surface-200 dark:border-surface-700';
    }

    readonly submitting = signal(false);
    readonly formError = signal<string | null>(null);
    readonly passwordFieldError = signal<string | null>(null);
    readonly passwordPolicyHint = PASSWORD_POLICY_HINT;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, AUTH_SIGNUP_PAGE_META);
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
        this.loadLegalVersions(false);
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

        const legalVersions = this.legalVersions();

        if (!this.legalConsent()) {
            this.formError.set(LEGAL_ACCEPTANCE_CODE_MESSAGES['LegalAcceptances.Required']);

            return;
        }

        if (!legalVersions) {
            this.formError.set('Hukuki metin sürümleri yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
            this.loadLegalVersions(true);

            return;
        }

        const body = mapPublicOwnerSignupFormToRequest({
            planCode: plan.apiCode,
            tenantName,
            clinicName,
            clinicCity,
            email,
            password,
            acceptedLegalDocuments: legalVersions,
            discountCode: this.discountCode(),
            startMode: this.startMode()
        });

        this.submitting.set(true);
        this.signup
            .signup(body)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
                next: (res) => {
                    this.loginEmailAfterSuccess.set(email);
                    this.successResult.set(res);
                    clearPendingDiscountCode();
                },
                error: (err: unknown) => {
                    this.formError.set(publicOwnerSignupFailureMessage(err));

                    if (isLegalVersionOutdatedError(err)) {
                        this.legalConsent.set(false);
                        this.loadLegalVersions(true);
                    }
                }
            });
    }

    /** Görünen ve gönderilen sürüm backend'den (tek kaynak); 409 sonrası yenilenir. */
    private loadLegalVersions(refresh: boolean): void {
        (refresh ? this.legal.refreshCurrentVersions() : this.legal.getCurrentVersions()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (versions) => this.legalVersions.set(versions),
            error: () => this.legalVersions.set(null)
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
