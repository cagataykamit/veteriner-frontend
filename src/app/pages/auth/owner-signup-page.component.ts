import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { DEFAULT_PANEL_AFTER_AUTH } from '@/app/core/auth/auth-return-url.utils';
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
import { PublicAuthShellComponent } from '@/app/pages/public/components/public-auth-shell.component';
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
import { revealField } from '@/app/shared/forms/form-field/form-field.utils';

const PLAN_REQUIRED_MESSAGE = 'Bir paket seçin.';

/** Alanın yanında gösterilen zorunlu alan hataları (şifre ve vergi numarasının kendi hata alanı vardır). */
type SignupField = 'plan' | 'tenantName' | 'clinicName' | 'clinicCity' | 'fullName';
const FIELD_REQUIRED_MESSAGES: Readonly<Record<SignupField, string>> = {
    plan: PLAN_REQUIRED_MESSAGE,
    tenantName: 'Klinik / işletme adını yazın.',
    clinicName: 'İlk klinik adını yazın.',
    clinicCity: 'Şehri yazın.',
    fullName: 'Adınızı ve soyadınızı yazın.'
};
type RequiredField = SignupField | 'taxIdentity' | 'email' | 'password';
/** Alanın ekrandaki adı (uyarıda sayılır) ve kaydırılacak öğe; sıra formdakiyle aynı, ilk eksik alana gidilir. */
const FIELD_TARGETS: Readonly<Record<RequiredField, { readonly label: string; readonly elementId: string }>> = {
    plan: { label: 'Paket', elementId: 'signup-plan-group' },
    tenantName: { label: 'Klinik / işletme adı', elementId: 'tenantName' },
    clinicName: { label: 'İlk klinik adı', elementId: 'clinicName' },
    clinicCity: { label: 'Şehir', elementId: 'clinicCity' },
    taxIdentity: { label: 'Vergi numarası ya da TC kimlik no', elementId: 'taxIdentityNumber' },
    fullName: { label: 'Adınız soyadınız', elementId: 'fullName' },
    email: { label: 'Yetkili e-posta', elementId: 'signupEmailField' },
    password: { label: 'Şifre', elementId: 'password' }
};
const missingFieldsMessage = (labels: readonly string[]): string => `Doldurulmamış alanlar: ${labels.join(', ')}.`;
const EMAIL_REQUIRED_MESSAGE = TRIAL_SIGNUP_CODE_MESSAGES['SignupEmail.VerificationRequired'];
const EMAIL_MISSING_MESSAGE = 'E-posta adresinizi yazıp gelen kodla doğrulayın.';
/** Kaydın reddettiği e-posta doğrulaması: bileşen baştan başlar (`TRIAL_SIGNUP_ABUSE_API_CONTRACT.md` §5). */
const EMAIL_RESET_CODES = new Set(['SignupEmail.VerificationRequired', 'SignupIdentity.DuplicateEmail', 'Users.DuplicateEmail']);
const TAX_IDENTITY_CODES = new Set(['SignupIdentity.DuplicateTaxIdentity', 'SignupIdentity.Validation.TaxIdentityRequired']);

@Component({
    selector: 'app-owner-signup-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, RadioButtonModule, RippleModule, RouterLink, PublicAuthShellComponent, LegalConsentCheckboxComponent, DiscountCodeFieldComponent, ExampleClinicSummaryComponent, SignupEmailVerificationComponent, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-auth-shell [wide]="true">
            @if (successResult(); as res) {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">Kayıt tamamlandı</h1>
                    <p class="public-auth-subtitle">Deneme süreniz başladı. Aşağıdaki tarihlerle giriş yapabilirsiniz.</p>
                </div>
                @if (res.exampleClinic; as example) {
                    <div class="public-auth-panel" data-testid="signup-example-clinic-card">
                        <span class="public-auth-option-title">Yüklenen örnek içerik</span>
                        <p class="public-auth-option-text mb-3">Örnek Veteriner Kliniği hazır: giriş yapınca Bugün, randevu ve hasta ekranlarını dolu görürsünüz.</p>
                        <app-example-clinic-summary [summary]="example" />
                    </div>
                } @else {
                    <p class="public-auth-hint mb-6" data-testid="signup-empty-clinic-note">Boş klinikle başlıyorsunuz. İsterseniz örnek içeriği daha sonra Ayarlar &gt; Abonelik sayfasından yükleyebilirsiniz.</p>
                }
                <div class="public-auth-panel">
                    <span class="public-auth-option-text">Seçilen plan</span>
                    <span class="public-auth-option-title mb-4">{{ successPlanTitle(res) }}</span>
                    @if (res.discount; as discount) {
                        <div class="text-sm mb-4" data-testid="signup-discount-note">
                            Ortak kodu <span class="font-semibold">{{ discount.code }}</span
                            >:
                            {{ discountNote(discount.discountPercent, discount.discountMonths) }}
                        </div>
                    }
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span class="public-auth-option-text">Deneme başlangıcı</span>
                            <span class="public-auth-option-strong">{{ res.trialStartsAtUtc | trDate }}</span>
                        </div>
                        <div>
                            <span class="public-auth-option-text">Deneme bitişi</span>
                            <span class="public-auth-option-strong">{{ res.trialEndsAtUtc | trDate }}</span>
                        </div>
                    </div>
                </div>
                <button pButton type="button" class="w-full public-auth-submit" [loading]="autoSignIn()" [disabled]="autoSignIn()" (click)="goToLogin()" data-testid="signup-go-login">
                    {{ autoSignIn() ? 'Panele giriliyor…' : 'Giriş yap' }}
                </button>
                <p class="public-auth-alt">
                    <a routerLink="/paketler" class="public-auth-link">Paketlere dön</a>
                </p>
            } @else {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">Kliniğinizi ücretsiz deneyin</h1>
                    <p class="public-auth-subtitle">Deneme hesabınızı tek adımda açın.</p>
                    <ul class="public-auth-ticks">
                        <li><i class="pi pi-check" aria-hidden="true"></i>kart gerekmez</li>
                        <li><i class="pi pi-check" aria-hidden="true"></i>satış görüşmesi yok</li>
                    </ul>
                </div>

                <h2 id="signup-plan-label" class="public-auth-group public-auth-group--first">Paket seçin</h2>
                <div id="signup-plan-group" role="radiogroup" aria-labelledby="signup-plan-label" class="public-auth-plans">
                    @for (option of planOptions(); track option.def.slug) {
                        <button
                            type="button"
                            role="radio"
                            class="public-auth-option"
                            [class.public-auth-option--selected]="option.selected"
                            [attr.aria-checked]="option.selected"
                            [attr.data-plan]="option.def.slug"
                            (click)="selectPlan(option.def)"
                        >
                            <span class="public-auth-option-title">{{ option.def.title }}</span>
                            <span class="public-auth-option-text">{{ option.def.description }}</span>
                            @if (option.price; as price) {
                                <span class="public-auth-option-strong">{{ price.amount }} <small>{{ price.unit }}</small></span>
                            }
                            @if (option.userLimit; as userLimit) {
                                <span class="public-auth-option-text">{{ userLimit }}</span>
                            }
                        </button>
                    }
                </div>
                @if (fieldError('plan'); as error) {
                    <small class="text-danger block mt-2" role="alert" data-testid="signup-plan-error">{{ error }}</small>
                }
                <p class="public-auth-hint">Her paket 14 gün ücretsiz denenir, kart bilgisi istenmez. <a routerLink="/paketler" class="public-auth-link public-auth-link--inline">Paketleri karşılaştırın</a></p>

                <h2 class="public-auth-group">Klinik</h2>
                <div class="public-auth-field">
                    <label for="tenantName" class="public-auth-label">Klinik / işletme adı *</label>
                    <input pInputText id="tenantName" type="text" class="w-full" [(ngModel)]="tenantName" (ngModelChange)="clearFieldError('tenantName')" [attr.aria-invalid]="fieldError('tenantName') ? true : null" autocomplete="organization" />
                    @if (fieldError('tenantName'); as error) {
                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                    }
                </div>

                <div class="public-auth-row2">
                    <div class="public-auth-field">
                        <label for="clinicName" class="public-auth-label">İlk klinik adı *</label>
                        <input pInputText id="clinicName" type="text" class="w-full" [(ngModel)]="clinicName" (ngModelChange)="clearFieldError('clinicName')" [attr.aria-invalid]="fieldError('clinicName') ? true : null" autocomplete="organization" />
                        @if (fieldError('clinicName'); as error) {
                            <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                        }
                    </div>
                    <div class="public-auth-field">
                        <label for="clinicCity" class="public-auth-label">Şehir *</label>
                        <input pInputText id="clinicCity" type="text" class="w-full" [(ngModel)]="clinicCity" (ngModelChange)="clearFieldError('clinicCity')" [attr.aria-invalid]="fieldError('clinicCity') ? true : null" autocomplete="address-level2" />
                        @if (fieldError('clinicCity'); as error) {
                            <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                        }
                    </div>
                </div>

                <div class="public-auth-field">
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
                    <p id="taxIdentityHint" class="public-auth-hint">Her işletme bir kez ücretsiz deneyebilir; ücretli plana geçerseniz faturanız bu bilgiyle kesilir. Şahıs işletmeleri TC kimlik numarası girebilir.</p>
                    @if (taxIdentityError(); as error) {
                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                    }
                </div>

                <h2 class="public-auth-group">Hesabınız</h2>
                <div class="public-auth-field">
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
                    <p id="fullNameHint" class="public-auth-hint">Hekim listelerinde ve kesinleştirilen muayenelerde bu ad görünür.</p>
                    @if (fieldError('fullName'); as error) {
                        <small class="text-danger block mt-1" role="alert">{{ error }}</small>
                    }
                </div>

                <div id="signupEmailField" class="public-auth-field">
                    <app-signup-email-verification [disabled]="submitting()" [turnstileSiteKey]="turnstileSiteKey()" (verifiedChange)="onEmailVerified($event)" />
                </div>

                <div class="public-auth-field">
                    <label for="password" class="public-auth-label">Şifre *</label>
                    <p-password id="password" [(ngModel)]="password" placeholder="Şifre" [toggleMask]="true" class="w-full" [fluid]="true" [feedback]="false" />
                    <p class="public-auth-hint">{{ passwordPolicyHint }}</p>
                    @if (passwordFieldError()) {
                        <small class="text-danger block mt-2">{{ passwordFieldError() }}</small>
                    }
                </div>

                <div class="public-auth-field">
                    <app-discount-code-field inputId="signupDiscountCode" [disabled]="submitting()" [(code)]="discountCode" (validated)="discountValidation.set($event)" />
                </div>

                <fieldset class="public-auth-fieldset" data-testid="signup-start-mode">
                    <legend class="public-auth-group">Nasıl başlayalım?</legend>
                    <div class="public-auth-modes">
                        <label for="startModeExample" class="public-auth-option public-auth-option--radio" [class.public-auth-option--selected]="startMode() === 'example'">
                            <p-radiobutton inputId="startModeExample" name="startMode" value="example" [disabled]="submitting()" [ngModel]="startMode()" (ngModelChange)="startMode.set($event)" />
                            <span class="min-w-0">
                                <span class="public-auth-option-title">Örnek Veteriner Kliniğini yükle <span class="public-auth-recommended">(önerilen)</span></span>
                                <span class="public-auth-option-text"
                                    >Müşteri, hasta, randevu, muayene, aşı, ödeme ve stok örnekleriyle dolu bir klinikte ilk dakikadan deneyin. Veriler tamamen sentetiktir, gerçek müşteri verisi içermez ve "ÖRNEK" olarak
                                    işaretlidir.</span
                                >
                            </span>
                        </label>
                        <label for="startModeEmpty" class="public-auth-option public-auth-option--radio" [class.public-auth-option--selected]="startMode() === 'empty'">
                            <p-radiobutton inputId="startModeEmpty" name="startMode" value="empty" [disabled]="submitting()" [ngModel]="startMode()" (ngModelChange)="startMode.set($event)" />
                            <span class="min-w-0">
                                <span class="public-auth-option-title">Boş klinikle başla</span>
                                <span class="public-auth-option-text">Kendi kayıtlarınızı sıfırdan girin. Örnek içeriği daha sonra Ayarlar &gt; Abonelik sayfasından da yükleyebilirsiniz.</span>
                            </span>
                        </label>
                    </div>
                </fieldset>

                <div class="public-auth-consent">
                    <app-legal-consent-checkbox inputId="signupLegalConsent" [documents]="legalDocumentTypes()" [disabled]="submitting()" [(checked)]="legalConsent" />
                </div>

                <button pButton type="button" class="w-full public-auth-submit" [disabled]="submitting() || !legalConsent()" (click)="submit()">@if (submitting()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Hesabı oluştur</button>
                <p class="public-auth-hint text-center">
                    @if (!legalConsent()) {
                        <span data-testid="signup-consent-hint">Hesabı oluşturmak için yukarıdaki metinleri onaylayın.</span>
                    }
                    Bu adımda ödeme alınmaz; deneme süresi kurum aboneliğinde başlatılır.
                </p>

                @if (formError()) {
                    <div class="public-auth-alert" role="alert" aria-live="assertive">
                        <div class="public-auth-alert-box">
                            <i class="pi pi-info-circle shrink-0 public-auth-alert-text" aria-hidden="true"></i>
                            <span class="public-auth-alert-text">{{ formError() }}</span>
                        </div>
                    </div>
                }

                <p class="public-auth-alt">Zaten hesabınız var mı? <a routerLink="/auth/login" class="public-auth-link">Giriş yap</a></p>
            }
        </app-public-auth-shell>
    `
})
export class OwnerSignupPageComponent implements OnInit {
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
    private readonly auth = inject(AuthService);

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
    /** Success sonrası login prefill için saklanır (otomatik giriş olmazsa giriş sayfasına taşınır). */
    private readonly loginEmailAfterSuccess = signal<string>('');
    /** Kayıttan hemen sonra az önce yazılan bilgilerle giriş sürüyor; başarısızsa "Giriş yap" kartı kalır. */
    readonly autoSignIn = signal(false);

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

        const taxIdentityMissing = this.taxIdentityRequired() && !this.taxIdentityNumber.trim();
        const emailMissing = !this.emailVerification();

        if (taxIdentityMissing) {
            this.taxIdentityError.set(TAX_IDENTITY_INVALID_MESSAGE);
        }

        if (emailMissing) {
            this.emailField()?.error.set(EMAIL_MISSING_MESSAGE);
        }

        if (!password) {
            this.passwordFieldError.set(validateStrongPasswordValue(''));
        }

        const empty = new Set<RequiredField>([...missing, ...(taxIdentityMissing ? ['taxIdentity' as const] : []), ...(emailMissing ? ['email' as const] : []), ...(password ? [] : ['password' as const])]);

        if (!plan || empty.size > 0) {
            const targets = (Object.keys(FIELD_TARGETS) as RequiredField[]).filter((field) => empty.has(field)).map((field) => FIELD_TARGETS[field]);

            this.formError.set(missingFieldsMessage(targets.map((t) => t.label)));
            this.showField(targets[0].elementId);

            return;
        }

        const passwordPolicyError = validateStrongPasswordValue(password);

        if (passwordPolicyError) {
            this.passwordFieldError.set(passwordPolicyError);
            this.showField(FIELD_TARGETS.password.elementId);

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
            this.showField(FIELD_TARGETS.email.elementId);

            return;
        }

        const taxIdentityNumber = this.taxIdentityNumber.trim();

        if ((taxIdentityNumber || this.taxIdentityRequired()) && !isTaxIdentityFormat(taxIdentityNumber)) {
            this.taxIdentityError.set(TAX_IDENTITY_INVALID_MESSAGE);
            this.formError.set(TAX_IDENTITY_INVALID_MESSAGE);
            this.showField(FIELD_TARGETS.taxIdentity.elementId);

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
                    this.signInAfterSignup(email, password, res);
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

    /** Uyarı düğmenin altında kalır; düzeltilecek alan ekranın ortasına getirilip odaklanır (panel formlarındaki O3). */
    private showField(elementId: string): void {
        const element = this.document.getElementById(elementId);

        if (element) {
            revealField(element);
        }
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

    /**
     * E-posta kodla doğrulandı ve şifre az önce yazıldı: kullanıcıya şifreyi ikinci kez yazdırmadan oturum açılır ve kayıtta
     * kurulan klinik seçilir. Herhangi bir adım olmazsa sessizce "Giriş yap" kartına düşülür (kayıt zaten tamam).
     */
    private signInAfterSignup(email: string, password: string, res: PublicOwnerSignupResultDto): void {
        this.autoSignIn.set(true);
        this.auth
            .login({ email, password })
            .pipe(
                switchMap(() => this.auth.selectClinic(res.clinicId, this.clinicName.trim() || null)),
                finalize(() => this.autoSignIn.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.password = '';
                    void this.router.navigateByUrl(DEFAULT_PANEL_AFTER_AUTH);
                },
                error: () => undefined
            });
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
