import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
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
import { SignupEmailVerificationComponent } from '@/app/features/public/components/signup-email-verification.component';
import type { SignupEmailVerification } from '@/app/features/public/models/trial-signup.model';
import { TrialSignupService } from '@/app/features/public/services/trial-signup.service';
import { isTaxIdentityFormat, TAX_IDENTITY_INVALID_MESSAGE, TRIAL_SIGNUP_CODE_MESSAGES, trialSignupErrorCode } from '@/app/features/public/utils/trial-signup.utils';
import { defByApiCode, formatUserLimit, parsePlanQueryParam, planOffer, planPriceView, PRICING_PLAN_DEFS, type PricingPlanDef } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PublicPlanCatalogService } from '@/app/features/public/services/public-plan-catalog.service';
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

const PLAN_REQUIRED_MESSAGE = 'Bir paket seçin.';
const MISSING_FIELDS_MESSAGE = 'Eksik alanları doldurun; ilgili alanın altında yazıyor.';

/** Alanın yanında gösterilen zorunlu alan hataları (şifre ve vergi numarasının kendi hata alanı vardır). */
type SignupField = 'plan' | 'tenantName' | 'clinicName' | 'clinicCity' | 'fullName';
const FIELD_REQUIRED_MESSAGES: Readonly<Record<SignupField, string>> = {
    plan: PLAN_REQUIRED_MESSAGE,
    tenantName: 'Klinik / işletme adını yazın.',
    clinicName: 'İlk klinik adını yazın.',
    clinicCity: 'Şehri yazın.',
    fullName: 'Adınızı ve soyadınızı yazın.'
};
const EMAIL_REQUIRED_MESSAGE = TRIAL_SIGNUP_CODE_MESSAGES['SignupEmail.VerificationRequired'];
/** Kaydın reddettiği e-posta doğrulaması: bileşen baştan başlar (`TRIAL_SIGNUP_ABUSE_API_CONTRACT.md` §5). */
const EMAIL_RESET_CODES = new Set(['SignupEmail.VerificationRequired', 'SignupIdentity.DuplicateEmail', 'Users.DuplicateEmail']);
const TAX_IDENTITY_CODES = new Set(['SignupIdentity.DuplicateTaxIdentity', 'SignupIdentity.Validation.TaxIdentityRequired']);

@Component({
    selector: 'app-owner-signup-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, RadioButtonModule, RippleModule, RouterLink, PublicLegalLinksComponent, LegalConsentCheckboxComponent, DiscountCodeFieldComponent, ExampleClinicSummaryComponent, SignupEmailVerificationComponent, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="public-page public-site public-auth-page">
            <div class="public-auth-shell public-auth-shell--wide">
                <div class="public-auth-card-frame">
                    <div class="public-auth-card-inner">
                        @if (successResult(); as res) {
                            <div class="public-auth-header">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex">
                                    <img [src]="brand.logoFull" alt="Vetinity" class="public-auth-logo block dark:hidden" width="120" height="30" />
                                    <img [src]="brand.logoFullDark" alt="Vetinity" class="public-auth-logo hidden dark:block" width="120" height="30" />
                                </a>
                                <div class="public-auth-title">Kayıt tamamlandı</div>
                                <span class="public-auth-subtitle">Deneme süreniz başladı. Aşağıdaki tarihlerle giriş yapabilirsiniz.</span>
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
                            <div class="public-auth-header">
                                <a routerLink="/" aria-label="Vetinity ana sayfasına dön" class="inline-flex">
                                    <img [src]="brand.logoFull" alt="Vetinity" class="public-auth-logo block dark:hidden" width="120" height="30" />
                                    <img [src]="brand.logoFullDark" alt="Vetinity" class="public-auth-logo hidden dark:block" width="120" height="30" />
                                </a>
                                <div class="public-auth-title">Hesap oluştur</div>
                                <span class="public-auth-subtitle">Deneme paketiyle işletmenizi tek adımda başlatın</span>
                            </div>

                            <div class="flex flex-col gap-6">
                                <div>
                                    <div id="signup-plan-label" class="public-auth-label">Paket seçin *</div>
                                    <div role="radiogroup" aria-labelledby="signup-plan-label" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        @for (option of planOptions(); track option.def.slug) {
                                            <button
                                                type="button"
                                                role="radio"
                                                class="text-left rounded-lg border p-3 cursor-pointer bg-transparent"
                                                [class.border-primary]="option.selected"
                                                [class.border-surface-200]="!option.selected"
                                                [class.dark:border-surface-700]="!option.selected"
                                                [attr.aria-checked]="option.selected"
                                                [attr.data-plan]="option.def.slug"
                                                (click)="selectPlan(option.def)"
                                            >
                                                <span class="block font-semibold text-surface-900 dark:text-surface-0">{{ option.def.title }}</span>
                                                <span class="block text-sm text-muted-color mt-1">{{ option.def.description }}</span>
                                                @if (option.userLimit; as userLimit) {
                                                    <span class="block text-sm text-surface-900 dark:text-surface-0 mt-2">{{ userLimit }}</span>
                                                }
                                                @if (option.price; as price) {
                                                    <span class="block text-sm text-muted-color">{{ price.amount }} {{ price.unit }}</span>
                                                }
                                            </button>
                                        }
                                    </div>
                                    @if (fieldError('plan'); as error) {
                                        <small class="text-danger block mt-2" role="alert" data-testid="signup-plan-error">{{ error }}</small>
                                    }
                                    <p class="text-sm text-muted-color m-0 mt-2">Her paket 14 gün ücretsiz denenir, kart bilgisi istenmez.</p>
                                    <a routerLink="/paketler" class="public-brand-link no-underline text-sm">Paketleri karşılaştırın</a>
                                </div>

                                <div>
                                    <label for="tenantName" class="public-auth-label">Klinik / işletme adı *</label>
                                    <input pInputText id="tenantName" type="text" class="w-full" [(ngModel)]="tenantName" (ngModelChange)="clearFieldError('tenantName')" [attr.aria-invalid]="fieldError('tenantName') ? true : null" autocomplete="organization" />
                                    @if (fieldError('tenantName'); as error) {
                                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                                    }
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label for="clinicName" class="public-auth-label">İlk klinik adı *</label>
                                        <input pInputText id="clinicName" type="text" class="w-full" [(ngModel)]="clinicName" (ngModelChange)="clearFieldError('clinicName')" [attr.aria-invalid]="fieldError('clinicName') ? true : null" autocomplete="organization" />
                                        @if (fieldError('clinicName'); as error) {
                                            <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                                        }
                                    </div>
                                    <div>
                                        <label for="clinicCity" class="public-auth-label">Şehir *</label>
                                        <input pInputText id="clinicCity" type="text" class="w-full" [(ngModel)]="clinicCity" (ngModelChange)="clearFieldError('clinicCity')" [attr.aria-invalid]="fieldError('clinicCity') ? true : null" autocomplete="address-level2" />
                                        @if (fieldError('clinicCity'); as error) {
                                            <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                                        }
                                    </div>
                                </div>

                                <div>
                                    <label for="fullName" class="public-auth-label">Adınız soyadınız *</label>
                                    <input
                                        pInputText
                                        id="fullName"
                                        type="text"
                                        class="w-full"
                                        maxlength="120"
                                        [(ngModel)]="fullName"
                                        (ngModelChange)="clearFieldError('fullName')"
                                        [attr.aria-invalid]="fieldError('fullName') ? true : null"
                                        aria-describedby="fullNameHint"
                                        autocomplete="name"
                                        data-testid="signup-full-name"
                                    />
                                    <small id="fullNameHint" class="block text-muted-color mt-1">Hekim listelerinde ve kesinleştirilen muayenelerde bu ad görünür.</small>
                                    @if (fieldError('fullName'); as error) {
                                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                                    }
                                </div>

                                <div>
                                    <label for="taxIdentityNumber" class="public-auth-label">Vergi numarası ya da TC kimlik no{{ taxIdentityRequired() ? ' *' : '' }}</label>
                                    <input
                                        pInputText
                                        id="taxIdentityNumber"
                                        type="text"
                                        inputmode="numeric"
                                        maxlength="11"
                                        class="w-full"
                                        [ngModel]="taxIdentityNumber"
                                        (ngModelChange)="onTaxIdentityChange($event)"
                                        [attr.aria-invalid]="taxIdentityError() ? true : null"
                                        aria-describedby="taxIdentityHint"
                                        data-testid="signup-tax-identity"
                                    />
                                    <small id="taxIdentityHint" class="block text-muted-color mt-1">Her işletme bir kez ücretsiz deneyebilir; ücretli plana geçerseniz faturanız bu bilgiyle kesilir. Şahıs işletmeleri TC kimlik numarası girebilir.</small>
                                    @if (taxIdentityError(); as error) {
                                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                                    }
                                </div>

                                <app-signup-email-verification [disabled]="submitting()" [turnstileSiteKey]="turnstileSiteKey()" (verifiedChange)="onEmailVerified($event)" />

                                <div>
                                    <label for="password" class="public-auth-label">Şifre *</label>
                                    <p class="text-sm text-muted-color m-0 mb-2">{{ passwordPolicyHint }}</p>
                                    <p-password id="password" [(ngModel)]="password" placeholder="Şifre" [toggleMask]="true" class="w-full" [fluid]="true" [feedback]="false" />
                                    @if (passwordFieldError()) {
                                        <small class="text-danger block mt-2">{{ passwordFieldError() }}</small>
                                    }
                                </div>

                                <app-discount-code-field inputId="signupDiscountCode" [disabled]="submitting()" [(code)]="discountCode" (validated)="discountValidation.set($event)" />

                                <fieldset class="border-0 p-0 m-0 min-w-0" data-testid="signup-start-mode">
                                    <legend class="public-auth-label p-0">Nasıl başlayalım?</legend>
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

                                <p class="text-sm text-muted-color m-0">Bu adımda ödeme alınmaz; deneme süresi kurum aboneliğinde başlatılır.</p>

                                <app-legal-consent-checkbox inputId="signupLegalConsent" [documents]="legalDocumentTypes()" [disabled]="submitting()" [(checked)]="legalConsent" />

                                <button pButton type="button" class="w-full public-auth-submit" [disabled]="submitting() || !legalConsent()" (click)="submit()">@if (submitting()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Hesabı oluştur</button>
                                @if (!legalConsent()) {
                                    <small class="block text-muted-color -mt-4" data-testid="signup-consent-hint">Hesabı oluşturmak için yukarıdaki metinleri onaylayın.</small>
                                }

                                @if (formError()) {
                                    <div class="rounded-sm border-l-[3px] border-l-red-400/75 bg-red-500/[0.06] py-2 px-3 dark:border-l-red-500/45 dark:bg-red-500/[0.08]" role="alert" aria-live="assertive">
                                        <span class="text-sm font-medium text-red-950 dark:text-red-100">{{ formError() }}</span>
                                    </div>
                                }

                                <div class="text-center flex flex-col items-center gap-2">
                                    <a routerLink="/auth/login" class="public-brand-link no-underline">Zaten hesabınız var mı? Giriş yapın</a>
                                    <a routerLink="/paketler" class="inline-flex min-h-11 items-center text-muted-color font-medium no-underline text-sm">Paketlere dön</a>
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
    private readonly planCatalog = inject(PublicPlanCatalogService);
    private readonly trialSignup = inject(TrialSignupService);

    /** Kayıt olan klinik yöneticisidir: sunucunun yayımladığı tüm belgeler (ADR-029 madde 4). */
    private readonly legalVersions = signal<LegalDocumentVersionDto[] | null>(null);
    readonly legalDocumentTypes = computed<readonly LegalDocumentType[]>(() => this.legalVersions()?.map((v) => v.documentType) ?? (Object.keys(LEGAL_DOCUMENTS_BY_TYPE) as LegalDocumentType[]));
    readonly legalConsent = signal(false);

    /** Paketi kullanıcı seçer; varsayılan yok. Paketler sayfasından gelen `?plan=` seçimi hazır getirir. */
    readonly selectedPlan = signal<PricingPlanDef | null>(null);
    readonly planOptions = computed(() => {
        const state = this.planCatalog.state();
        const selected = this.selectedPlan();

        return PRICING_PLAN_DEFS.map((def) => {
            const offer = planOffer(state, def);

            return {
                def,
                selected: selected?.slug === def.slug,
                userLimit: formatUserLimit(offer?.maxUsers ?? null),
                price: planPriceView(offer, state.status === 'ready' ? state.catalog : null)
            };
        });
    });
    readonly successResult = signal<PublicOwnerSignupResultDto | null>(null);
    /** Success sonrası login prefill için saklanır. */
    private readonly loginEmailAfterSuccess = signal<string>('');

    tenantName = '';
    clinicName = '';
    clinicCity = '';
    password = '';
    taxIdentityNumber = '';
    fullName = '';

    /** Zorunlu alan hataları alanın altında gösterilir (genel hata kutusu yalnız özet verir). */
    readonly fieldErrors = signal<Partial<Record<SignupField, string>>>({});

    fieldError(field: SignupField): string | null {
        return this.fieldErrors()[field] ?? null;
    }

    clearFieldError(field: SignupField): void {
        if (this.fieldErrors()[field]) {
            const next = { ...this.fieldErrors() };

            delete next[field];
            this.fieldErrors.set(next);
        }
    }

    /** Doğrulanan e-posta ve kayıt jetonu (TRIAL-001); doğrulanmadan kayıt gönderilmez. */
    readonly emailVerification = signal<SignupEmailVerification | null>(null);
    private readonly emailField = viewChild(SignupEmailVerificationComponent);

    /** Sunucu ayarları (tek kaynak): vergi numarası zorunluluğu ve Turnstile site anahtarı. Yüklenemezse zorunlu varsayılır. */
    readonly taxIdentityRequired = signal(true);
    readonly turnstileSiteKey = signal<string | null>(null);
    readonly taxIdentityError = signal<string | null>(null);

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
        this.planCatalog.ensureLoaded();
        this.trialSignup
            .settings()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (settings) => {
                    this.taxIdentityRequired.set(settings.taxIdentityNumberRequired);
                    this.turnstileSiteKey.set(settings.turnstileSiteKey);
                },
                error: () => this.formError.set('Kayıt ayarları yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
            });
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
            if (this.successResult()) {
                return;
            }

            const linkedPlan = parsePlanQueryParam(q.get('plan'));

            if (linkedPlan) {
                this.selectedPlan.set(linkedPlan);
            }
        });
    }

    selectPlan(plan: PricingPlanDef): void {
        this.selectedPlan.set(plan);
        this.clearFieldError('plan');
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
        const fullName = this.fullName?.trim() ?? '';
        const password = this.password ?? '';
        const values: Record<SignupField, unknown> = { plan, tenantName, clinicName, clinicCity, fullName };
        const missing = (Object.keys(FIELD_REQUIRED_MESSAGES) as SignupField[]).filter((field) => !values[field]);

        this.fieldErrors.set(Object.fromEntries(missing.map((field) => [field, FIELD_REQUIRED_MESSAGES[field]])));

        if (!password) {
            this.passwordFieldError.set(validateStrongPasswordValue(''));
        }

        if (!plan || missing.length > 0 || !password) {
            this.formError.set(MISSING_FIELDS_MESSAGE);

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

        const verification = this.emailVerification();

        if (!verification) {
            this.formError.set(EMAIL_REQUIRED_MESSAGE);

            return;
        }

        const taxIdentityNumber = this.taxIdentityNumber.trim();

        if ((taxIdentityNumber || this.taxIdentityRequired()) && !isTaxIdentityFormat(taxIdentityNumber)) {
            this.taxIdentityError.set(TAX_IDENTITY_INVALID_MESSAGE);
            this.formError.set(TAX_IDENTITY_INVALID_MESSAGE);

            return;
        }

        const email = verification.email;
        const body = mapPublicOwnerSignupFormToRequest({
            planCode: plan.apiCode,
            tenantName,
            clinicName,
            clinicCity,
            email,
            password,
            acceptedLegalDocuments: legalVersions,
            discountCode: this.discountCode(),
            startMode: this.startMode(),
            emailVerificationToken: verification.token,
            taxIdentityNumber,
            fullName
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
                    const message = publicOwnerSignupFailureMessage(err);
                    const code = trialSignupErrorCode(err);

                    this.formError.set(message);

                    if (code && EMAIL_RESET_CODES.has(code)) {
                        this.emailField()?.reset(message);
                    }

                    if (code && TAX_IDENTITY_CODES.has(code)) {
                        this.taxIdentityError.set(message);
                    }

                    if (isLegalVersionOutdatedError(err)) {
                        this.legalConsent.set(false);
                        this.loadLegalVersions(true);
                    }
                }
            });
    }

    onEmailVerified(value: SignupEmailVerification | null): void {
        this.emailVerification.set(value);

        if (value && this.formError() === EMAIL_REQUIRED_MESSAGE) {
            this.formError.set(null);
        }
    }

    onTaxIdentityChange(value: string): void {
        this.taxIdentityNumber = (value ?? '').replace(/\D/g, '').slice(0, 11);
        this.taxIdentityError.set(null);
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
