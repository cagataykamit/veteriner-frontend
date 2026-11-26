import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { LegalDocumentVersionDto } from '@/app/entities/legal-document/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';
import type { PublicOwnerSignupRequestDto, PublicOwnerSignupResultDto } from '@/app/features/public/models/public-owner-signup-api.model';
import { PublicOwnerSignupService } from '@/app/features/public/services/public-owner-signup.service';
import { PublicPlanCatalogService } from '@/app/features/public/services/public-plan-catalog.service';
import { PRICING_PLAN_DEFS } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { DiscountCodesService } from '@/app/entities/sales-partner/services/discount-codes.service';
import { PENDING_DISCOUNT_CODE_KEY } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { TrialSignupService } from '@/app/features/public/services/trial-signup.service';
import { TRIAL_SIGNUP_CODE_MESSAGES } from '@/app/features/public/utils/trial-signup.utils';
import { OwnerSignupPageComponent } from './owner-signup-page.component';

const VERSIONS: LegalDocumentVersionDto[] = [
    { documentType: 'Terms', version: '0.1' },
    { documentType: 'Privacy', version: '0.1' },
    { documentType: 'DataProcessing', version: '0.1' }
];

const RESULT: PublicOwnerSignupResultDto = {
    tenantId: 't1',
    clinicId: 'c1',
    userId: 'u1',
    planCode: 'Basic',
    trialStartsAtUtc: '2026-10-16T00:00:00Z',
    trialEndsAtUtc: '2026-10-30T00:00:00Z',
    canLogin: true,
    nextStep: 'login'
};

describe('OwnerSignupPageComponent hukuki onay (ADR-029)', () => {
    let fixture: ComponentFixture<OwnerSignupPageComponent>;
    let cmp: OwnerSignupPageComponent;
    let signup: MockedObject<PublicOwnerSignupService>;
    let legal: MockedObject<LegalAcceptanceService>;

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const submitButton = (): HTMLButtonElement | undefined => Array.from(host().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Hesabı oluştur'));

    beforeEach(async () => {
        signup = {
            signup: vi.fn().mockName('PublicOwnerSignupService.signup')
        } as unknown as MockedObject<PublicOwnerSignupService>;
        legal = {
            getCurrentVersions: vi.fn().mockName('LegalAcceptanceService.getCurrentVersions'),
            refreshCurrentVersions: vi.fn().mockName('LegalAcceptanceService.refreshCurrentVersions')
        } as unknown as MockedObject<LegalAcceptanceService>;
        legal.getCurrentVersions.mockReturnValue(of(VERSIONS));
        legal.refreshCurrentVersions.mockReturnValue(of(VERSIONS));

        sessionStorage.removeItem(PENDING_DISCOUNT_CODE_KEY);
        const trialSignup = {
            settings: vi.fn().mockReturnValue(of({ taxIdentityNumberRequired: true, turnstileSiteKey: null })),
            requestEmailCode: vi.fn(),
            verifyEmailCode: vi.fn()
        };
        const discountCodes = {
            validate: vi.fn().mockName('DiscountCodesService.validate')
        };

        await TestBed.configureTestingModule({
            imports: [OwnerSignupPageComponent],
            providers: [provideRouter([]), { provide: PublicOwnerSignupService, useValue: signup }, { provide: LegalAcceptanceService, useValue: legal }, { provide: DiscountCodesService, useValue: discountCodes }, { provide: TrialSignupService, useValue: trialSignup }, { provide: PublicPlanCatalogService, useValue: { state: signal({ status: 'error' }), ensureLoaded: vi.fn() } }]
        }).compileComponents();

        fixture = TestBed.createComponent(OwnerSignupPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();

        cmp.tenantName = 'Pati Kurum';
        cmp.clinicName = 'Pati Klinik';
        cmp.clinicCity = 'Ankara';
        cmp.fullName = 'Ayşe Yılmaz';
        cmp.onEmailVerified({ email: 'sahip@example.com', token: 'jeton' });
        cmp.taxIdentityNumber = '1234567890';
        cmp.password = 'Abc12345!';
        cmp.selectPlan(PRICING_PLAN_DEFS[0]);
    });

    it('üç belgeye bağlantılı tek onay kutusu gösterir', () => {
        const hrefs = Array.from(host().querySelectorAll('.legal-consent a')).map((a) => a.getAttribute('href'));

        expect(hrefs).toEqual(['/kullanim-sartlari', '/gizlilik', '/veri-isleme-sozlesmesi']);
        expect(host().querySelectorAll('.legal-consent input[type="checkbox"]').length).toBe(1);
    });

    it('L-01 A düzeni: geniş kart, sade başlık, bölüm başlıkları; süs çipi yok, birincil düğme ortak sınıfta', () => {
        const groups = Array.from(host().querySelectorAll('.public-auth-group')).map((g) => g.textContent?.trim());

        expect(host().querySelector('.public-auth-card')?.classList).toContain('public-auth-card--wide');
        expect(host().querySelector('h1.public-auth-title')?.textContent?.trim()).toBe('Kliniğinizi ücretsiz deneyin');
        expect(groups).toEqual(['Paket seçin', 'Klinik', 'Hesabınız', 'Nasıl başlayalım?']);
        expect(host().querySelector('.public-auth-header [class*="chip"], .public-auth-header em')).toBeNull();
        expect(host().querySelector('label[for="tenantName"]')?.classList).toContain('public-auth-label');
        expect(submitButton()?.classList).toContain('public-auth-submit');
    });

    it('kutu işaretlenmeden gönderim pasif ve istek atılmaz', () => {
        expect(submitButton()?.disabled).toBe(true);

        cmp.submit();

        expect(signup.signup).not.toHaveBeenCalled();
        expect(cmp.formError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES['LegalAcceptances.Required']);
    });

    it('işaretlenince gönderim açılır ve backend sürümleri gövdeye eklenir', () => {
        signup.signup.mockReturnValue(of(RESULT));
        cmp.legalConsent.set(true);
        fixture.detectChanges();

        expect(submitButton()?.disabled).toBe(false);

        cmp.submit();

        const body = vi.mocked(signup.signup).mock.lastCall![0] as PublicOwnerSignupRequestDto;

        expect(body.acceptedLegalDocuments).toEqual(VERSIONS);
        expect(body.discountCode).toBeUndefined();
        expect(body.emailVerificationToken).toBe('jeton');
        expect(body.taxIdentityNumber).toBe('1234567890');
        expect(body.email).toBe('sahip@example.com');
        expect(cmp.successResult()).toEqual(RESULT);
    });

    describe('tek deneme kuralı (TRIAL-001)', () => {
        it('vergi numarası alanı ve not gösterilir', () => {
            expect(host().querySelector('[data-testid="signup-tax-identity"]')).not.toBeNull();
            expect(host().textContent).toContain('Her işletme bir kez ücretsiz deneyebilir; ücretli plana geçerseniz faturanız bu bilgiyle kesilir. Şahıs işletmeleri TC kimlik numarası girebilir.');
        });

        it('e-posta doğrulanmadan istek atılmaz', () => {
            cmp.onEmailVerified(null);
            cmp.legalConsent.set(true);

            cmp.submit();

            expect(signup.signup).not.toHaveBeenCalled();
            expect(cmp.formError()).toBe('Doldurulmamış alanlar: Yetkili e-posta.');
            fixture.detectChanges();
            expect(host().querySelector('#signupEmailField')?.textContent).toContain('E-posta adresinizi yazıp gelen kodla doğrulayın.');
        });

        it('zorunlu vergi numarası boşsa alanın altında kırmızı uyarı çıkar ve eksiklerde sayılır', () => {
            cmp.legalConsent.set(true);
            cmp.onTaxIdentityChange('');

            cmp.submit();

            expect(signup.signup).not.toHaveBeenCalled();
            expect(cmp.taxIdentityError()).toBe(TRIAL_SIGNUP_CODE_MESSAGES['SignupIdentity.Validation.TaxIdentityRequired']);
            expect(cmp.formError()).toBe('Doldurulmamış alanlar: Vergi numarası ya da TC kimlik no.');
        });

        it('zorunluyken vergi numarası boş ya da biçimsizse istek atılmaz', () => {
            cmp.legalConsent.set(true);
            cmp.onTaxIdentityChange('12a34');

            cmp.submit();

            expect(signup.signup).not.toHaveBeenCalled();
            expect(cmp.taxIdentityError()).toBe(TRIAL_SIGNUP_CODE_MESSAGES['SignupIdentity.Validation.TaxIdentityRequired']);
        });

        it('aynı vergi numarasıyla ikinci deneme: sade mesaj alanın altında gösterilir', () => {
            signup.signup.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SignupIdentity.DuplicateTaxIdentity' } })));
            cmp.legalConsent.set(true);

            cmp.submit();

            expect(cmp.formError()).toBe('Bu vergi numarasıyla daha önce deneme hesabı açılmış.');
            expect(cmp.taxIdentityError()).toBe('Bu vergi numarasıyla daha önce deneme hesabı açılmış.');
        });
    });

    describe('örnek klinik seçimi (ADR-002, TRIAL-002)', () => {
        const EXAMPLE = {
            tenantId: 't1',
            clinicId: 'c1',
            clients: 12,
            pets: 20,
            appointments: 38,
            examinations: 26,
            vaccinations: 14,
            treatments: 9,
            labResults: 5,
            charges: 48,
            payments: 19,
            products: 10,
            stockMovements: 29
        };

        it('varsayılan seçim örnek klinik; iki seçenek ve sentetik veri açıklaması gösterilir', async () => {
            // ngModel değeri bir sonraki mikro görevde yazar; işaretli durum için beklenir.
            await fixture.whenStable();
            fixture.detectChanges();

            const fieldset = host().querySelector('[data-testid="signup-start-mode"]');
            const radios = Array.from(fieldset?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? []);

            expect(cmp.startMode()).toBe('example');
            expect(radios.length).toBe(2);
            expect(radios.find((r) => r.id === 'startModeExample')?.checked).toBe(true);
            expect(radios.find((r) => r.id === 'startModeEmpty')?.checked).toBe(false);
            expect(fieldset?.textContent).toContain('Örnek Veteriner Kliniğini yükle');
            expect(fieldset?.textContent).toContain('(önerilen)');
            expect(fieldset?.textContent).toContain('Boş klinikle başla');
            expect(fieldset?.textContent).toContain('gerçek müşteri verisi içermez');
        });

        it('varsayılanla gönderimde startWithExampleClinic=true gider; başarıda özet kartı gösterilir', () => {
            signup.signup.mockReturnValue(of({ ...RESULT, exampleClinic: EXAMPLE }));
            cmp.legalConsent.set(true);

            cmp.submit();
            fixture.detectChanges();

            expect((vi.mocked(signup.signup).mock.lastCall![0] as PublicOwnerSignupRequestDto).startWithExampleClinic).toBe(true);

            const card = host().querySelector('[data-testid="signup-example-clinic-card"]');

            expect(card?.textContent).toContain('Yüklenen örnek içerik');
            expect(card?.querySelector('[data-testid="example-clinic-count-clients"]')?.textContent).toContain('12');
            expect(card?.querySelector('[data-testid="example-clinic-count-pets"]')?.textContent).toContain('20');
            expect(card?.querySelector('[data-testid="example-clinic-count-payments"]')?.textContent).toContain('19');
            expect(host().querySelector('[data-testid="signup-empty-clinic-note"]')).toBeNull();
            expect(Array.from(host().querySelectorAll('button')).some((b) => b.textContent?.includes('Giriş yap'))).toBe(true);
        });

        it('boş klinik seçiminde false gider; başarıda boş klinik notu gösterilir', () => {
            signup.signup.mockReturnValue(of({ ...RESULT, exampleClinic: null }));
            cmp.startMode.set('empty');
            cmp.legalConsent.set(true);

            cmp.submit();
            fixture.detectChanges();

            expect((vi.mocked(signup.signup).mock.lastCall![0] as PublicOwnerSignupRequestDto).startWithExampleClinic).toBe(false);
            expect(host().querySelector('[data-testid="signup-example-clinic-card"]')).toBeNull();
            expect(host().querySelector('[data-testid="signup-empty-clinic-note"]')?.textContent).toContain('Boş klinikle başlıyorsunuz');
        });
    });

    it('ortak kodu girilmişse gövdeye eklenir, başarıda indirim notu gösterilir ve oturum belleği temizlenir (ADR-037)', () => {
        sessionStorage.setItem(PENDING_DISCOUNT_CODE_KEY, 'ISIK10');
        signup.signup.mockReturnValue(of({ ...RESULT, discount: { code: 'ISIK10', discountPercent: 10, discountMonths: 12 } }));
        cmp.discountCode.set('ISIK10');
        cmp.legalConsent.set(true);

        cmp.submit();
        fixture.detectChanges();

        expect((vi.mocked(signup.signup).mock.lastCall![0] as PublicOwnerSignupRequestDto).discountCode).toBe('ISIK10');
        expect(host().querySelector('[data-testid="signup-discount-note"]')?.textContent).toContain('%10 indirim, ilk 12 ay');
        expect(sessionStorage.getItem(PENDING_DISCOUNT_CODE_KEY)).toBeNull();
    });

    it('geçersiz kodda sunucunun tek tip hatasını gösterir', () => {
        const invalid = new HttpErrorResponse({ status: 400, error: { status: 400, extensions: { code: 'DiscountCodes.Invalid' } } });

        signup.signup.mockReturnValue(throwError(() => invalid));
        cmp.discountCode.set('YANLIS');
        cmp.legalConsent.set(true);
        cmp.submit();

        expect(cmp.formError()).toBe('Ortak kodu geçersiz.');
    });

    it('409 VersionOutdated: mesaj gösterir, onayı kaldırır ve sürümleri yeniler', () => {
        const outdated = new HttpErrorResponse({ status: 409, error: { status: 409, extensions: { code: LEGAL_VERSION_OUTDATED_CODE } } });

        signup.signup.mockReturnValue(throwError(() => outdated));
        cmp.legalConsent.set(true);
        cmp.submit();

        expect(cmp.formError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES[LEGAL_VERSION_OUTDATED_CODE]);
        expect(cmp.legalConsent()).toBe(false);
        expect(legal.refreshCurrentVersions).toHaveBeenCalled();
    });

    describe('paket seçimi', () => {
        const optionButton = (slug: string): HTMLButtonElement => host().querySelector<HTMLButtonElement>(`[role="radio"][data-plan="${slug}"]`)!;

        it('varsayılan paket yoktur: seçilmeden gönderilemez ve mesaj gösterilir', () => {
            const fresh = TestBed.createComponent(OwnerSignupPageComponent);

            fresh.detectChanges();
            expect(fresh.componentInstance.selectedPlan()).toBeNull();

            fresh.componentInstance.submit();

            expect(signup.signup).not.toHaveBeenCalled();
            expect(fresh.componentInstance.fieldError('plan')).toBe('Bir paket seçin.');
            fresh.detectChanges();
            expect((fresh.nativeElement as HTMLElement).querySelector('[data-testid="signup-plan-error"]')?.textContent?.trim()).toBe('Bir paket seçin.');
        });

        it('üç paket seçenek olarak gösterilir; tıklanan paket seçilir ve gövdeye gider', () => {
            cmp.legalConsent.set(true);
            signup.signup.mockReturnValue(of(RESULT));
            fixture.detectChanges();
            expect(host().querySelectorAll('[role="radio"][data-plan]').length).toBe(PRICING_PLAN_DEFS.length);

            optionButton('pro').click();
            fixture.detectChanges();

            expect(optionButton('pro').getAttribute('aria-checked')).toBe('true');
            expect(optionButton('basic').getAttribute('aria-checked')).toBe('false');

            cmp.submit();

            expect((signup.signup.mock.calls[0][0] as PublicOwnerSignupRequestDto).planCode).toBe('Pro');
        });

        it('paket seçilince "Bir paket seçin" mesajı kalkar', () => {
            cmp.selectedPlan.set(null);
            cmp.submit();
            expect(cmp.fieldError('plan')).toBe('Bir paket seçin.');

            cmp.selectPlan(PRICING_PLAN_DEFS[1]);

            expect(cmp.fieldError('plan')).toBeNull();
        });
    });

    describe('ad-soyad ve alan hataları (tam test 2026-11-22)', () => {
        it('ad-soyad gövdeye kırpılarak gider', () => {
            cmp.legalConsent.set(true);
            cmp.fullName = '  Ayşe Yılmaz ';
            signup.signup.mockReturnValue(of(RESULT));

            cmp.submit();

            expect((signup.signup.mock.calls[0][0] as PublicOwnerSignupRequestDto).fullName).toBe('Ayşe Yılmaz');
        });

        it('eksik alanın hatası alanın altında yazar, yazınca kalkar', () => {
            cmp.legalConsent.set(true);
            cmp.fullName = '';
            cmp.clinicCity = ' ';

            cmp.submit();
            fixture.detectChanges();

            expect(signup.signup).not.toHaveBeenCalled();
            expect(cmp.fieldError('fullName')).toBe('Adınızı ve soyadınızı yazın.');
            expect(cmp.fieldError('clinicCity')).toBe('Şehri yazın.');
            expect(cmp.fieldError('tenantName')).toBeNull();
            expect(host().querySelector('#fullName')?.getAttribute('aria-invalid')).toBe('true');

            cmp.clearFieldError('fullName');
            expect(cmp.fieldError('fullName')).toBeNull();
        });

        it('eksik alanlar uyarıda adlarıyla sayılır; ilk eksik alana kaydırılıp odaklanılır', () => {
            const original = Element.prototype.scrollIntoView;
            const scrollIntoView = vi.fn();

            Element.prototype.scrollIntoView = scrollIntoView;
            cmp.legalConsent.set(true);
            cmp.clinicName = '';
            cmp.fullName = '';
            cmp.password = '';

            try {
                cmp.submit();

                expect(cmp.formError()).toBe('Doldurulmamış alanlar: İlk klinik adı, Adınız soyadınız, Şifre.');
                expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
                expect(document.activeElement?.id).toBe('clinicName');
            } finally {
                Element.prototype.scrollIntoView = original;
            }
        });

        it('iç geliştirme notu gösterilmez', () => {
            expect(host().textContent).not.toContain('sonraki fazda');
        });
    });
});
