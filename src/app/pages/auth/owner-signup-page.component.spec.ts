import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { LegalDocumentVersionDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/features/legal-acceptance/utils/legal-acceptance-error.utils';
import type { PublicOwnerSignupRequestDto, PublicOwnerSignupResultDto } from '@/app/features/public/models/public-owner-signup-api.model';
import { PublicOwnerSignupService } from '@/app/features/public/services/public-owner-signup.service';
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
    let signup: jasmine.SpyObj<PublicOwnerSignupService>;
    let legal: jasmine.SpyObj<LegalAcceptanceService>;

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const submitButton = (): HTMLButtonElement | undefined =>
        Array.from(host().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Hesabı oluştur'));

    beforeEach(async () => {
        signup = jasmine.createSpyObj<PublicOwnerSignupService>('PublicOwnerSignupService', ['signup']);
        legal = jasmine.createSpyObj<LegalAcceptanceService>('LegalAcceptanceService', ['getCurrentVersions', 'refreshCurrentVersions']);
        legal.getCurrentVersions.and.returnValue(of(VERSIONS));
        legal.refreshCurrentVersions.and.returnValue(of(VERSIONS));

        await TestBed.configureTestingModule({
            imports: [OwnerSignupPageComponent],
            providers: [provideRouter([]), { provide: PublicOwnerSignupService, useValue: signup }, { provide: LegalAcceptanceService, useValue: legal }]
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
        expect(submitButton()?.disabled).toBeTrue();

        cmp.submit();

        expect(signup.signup).not.toHaveBeenCalled();
        expect(cmp.formError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES['LegalAcceptances.Required']);
    });

    it('işaretlenince gönderim açılır ve backend sürümleri gövdeye eklenir', () => {
        signup.signup.and.returnValue(of(RESULT));
        cmp.legalConsent.set(true);
        fixture.detectChanges();

        expect(submitButton()?.disabled).toBeFalse();

        cmp.submit();

        const body = signup.signup.calls.mostRecent().args[0] as PublicOwnerSignupRequestDto;

        expect(body.acceptedLegalDocuments).toEqual(VERSIONS);
        expect(cmp.successResult()).toEqual(RESULT);
    });

    it('409 VersionOutdated: mesaj gösterir, onayı kaldırır ve sürümleri yeniler', () => {
        const outdated = new HttpErrorResponse({ status: 409, error: { status: 409, extensions: { code: LEGAL_VERSION_OUTDATED_CODE } } });

        signup.signup.and.returnValue(throwError(() => outdated));
        cmp.legalConsent.set(true);
        cmp.submit();

        expect(cmp.formError()).toBe(LEGAL_ACCEPTANCE_CODE_MESSAGES[LEGAL_VERSION_OUTDATED_CODE]);
        expect(cmp.legalConsent()).toBeFalse();
        expect(legal.refreshCurrentVersions).toHaveBeenCalled();
    });
});
