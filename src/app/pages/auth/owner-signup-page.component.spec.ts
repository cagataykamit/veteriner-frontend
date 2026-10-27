import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { LegalDocumentVersionDto } from '@/app/entities/legal-document/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';
import type { PublicOwnerSignupRequestDto, PublicOwnerSignupResultDto } from '@/app/features/public/models/public-owner-signup-api.model';
import { PublicOwnerSignupService } from '@/app/features/public/services/public-owner-signup.service';
import { DiscountCodesService } from '@/app/entities/sales-partner/services/discount-codes.service';
import { PENDING_DISCOUNT_CODE_KEY } from '@/app/entities/sales-partner/utils/discount-code.utils';
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
        const discountCodes = {
            validate: vi.fn().mockName('DiscountCodesService.validate')
        };

        await TestBed.configureTestingModule({
            imports: [OwnerSignupPageComponent],
            providers: [provideRouter([]), { provide: PublicOwnerSignupService, useValue: signup }, { provide: LegalAcceptanceService, useValue: legal }, { provide: DiscountCodesService, useValue: discountCodes }]
        }).compileComponents();

        fixture = TestBed.createComponent(OwnerSignupPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();

        cmp.tenantName = 'Pati Kurum';
        cmp.clinicName = 'Pati Klinik';
        cmp.clinicCity = 'Ankara';
        cmp.email = 'sahip@example.com';
        cmp.password = 'Abc12345!';
    });

    it('üç belgeye bağlantılı tek onay kutusu gösterir', () => {
        const hrefs = Array.from(host().querySelectorAll('.legal-consent a')).map((a) => a.getAttribute('href'));

        expect(hrefs).toEqual(['/kullanim-sartlari', '/gizlilik', '/veri-isleme-sozlesmesi']);
        expect(host().querySelectorAll('.legal-consent input[type="checkbox"]').length).toBe(1);
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
        expect(cmp.successResult()).toEqual(RESULT);
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
});
