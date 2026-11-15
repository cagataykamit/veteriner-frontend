import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { SignupPhoneVerification } from '@/app/features/public/models/signup-phone-verification.model';
import { SignupPhoneVerificationService } from '@/app/features/public/services/signup-phone-verification.service';
import { SIGNUP_PHONE_INVALID_MESSAGE } from '@/app/features/public/utils/signup-phone-verification.utils';
import { SignupPhoneVerificationComponent } from './signup-phone-verification.component';

describe('SignupPhoneVerificationComponent (TRIAL-001)', () => {
    let fixture: ComponentFixture<SignupPhoneVerificationComponent>;
    let cmp: SignupPhoneVerificationComponent;
    let api: MockedObject<SignupPhoneVerificationService>;
    let emitted: (SignupPhoneVerification | null)[];

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const byTestId = <T extends HTMLElement>(id: string): T | null => host().querySelector<T>(`[data-testid="${id}"]`);

    beforeEach(async () => {
        vi.useFakeTimers();
        api = {
            requestCode: vi.fn().mockReturnValue(of({ expiresInSeconds: 300, resendAfterSeconds: 60 })),
            verifyCode: vi.fn().mockReturnValue(of({ phoneVerificationToken: 'jeton', expiresAtUtc: '2026-11-15T10:30:00Z' }))
        } as unknown as MockedObject<SignupPhoneVerificationService>;

        await TestBed.configureTestingModule({
            imports: [SignupPhoneVerificationComponent],
            providers: [{ provide: SignupPhoneVerificationService, useValue: api }]
        }).compileComponents();

        fixture = TestBed.createComponent(SignupPhoneVerificationComponent);
        cmp = fixture.componentInstance;
        emitted = [];
        cmp.verifiedChange.subscribe((v) => emitted.push(v));
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('geçersiz numarada kod istemez ve sade mesaj gösterir', () => {
        cmp.onPhoneChange('0212 123 45 67');
        cmp.sendCode();
        fixture.detectChanges();

        expect(api.requestCode).not.toHaveBeenCalled();
        expect(byTestId('signup-phone-status')?.textContent).toContain(SIGNUP_PHONE_INVALID_MESSAGE);
    });

    it('kod gönderince kod alanı açılır, 60 sn geri sayım biter ve yeniden gönderilebilir', () => {
        cmp.onPhoneChange('0532 123 45 67');
        cmp.sendCode();
        fixture.detectChanges();

        expect(api.requestCode).toHaveBeenCalledWith('0532 123 45 67');
        expect(byTestId('signup-phone-code')).not.toBeNull();
        expect(byTestId<HTMLButtonElement>('signup-phone-send')?.disabled).toBe(true);
        expect(byTestId('signup-phone-send')?.textContent).toContain('Yeniden gönder (60 sn)');

        vi.advanceTimersByTime(59_000);
        fixture.detectChanges();
        expect(byTestId('signup-phone-send')?.textContent).toContain('(1 sn)');

        vi.advanceTimersByTime(1_000);
        fixture.detectChanges();
        expect(byTestId<HTMLButtonElement>('signup-phone-send')?.disabled).toBe(false);
        expect(byTestId('signup-phone-send')?.textContent?.trim()).toBe('Yeniden gönder');
    });

    it('doğru kodla numara ve jeton üst bileşene verilir; numara değiştirilince sıfırlanır', () => {
        cmp.onPhoneChange('0532 123 45 67');
        cmp.sendCode();
        cmp.onCodeChange('12 34 56x');
        cmp.verify();
        fixture.detectChanges();

        expect(api.verifyCode).toHaveBeenCalledWith('0532 123 45 67', '123456');
        expect(emitted).toEqual([{ mobilePhone: '0532 123 45 67', token: 'jeton' }]);
        expect(byTestId('signup-phone-verified')?.textContent).toContain('doğrulandı');

        cmp.changePhone();
        fixture.detectChanges();

        expect(emitted.at(-1)).toBeNull();
        expect(byTestId('signup-phone-input')).not.toBeNull();
    });

    it('hatalı kodda sunucu mesajı gösterilir, doğrulama verilmez', () => {
        api.verifyCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'SignupPhone.CodeInvalid' } })));
        cmp.onPhoneChange('05321234567');
        cmp.sendCode();
        cmp.onCodeChange('000000');
        cmp.verify();
        fixture.detectChanges();

        expect(emitted).toEqual([]);
        expect(byTestId('signup-phone-status')?.textContent).toContain('Kod hatalı ya da süresi dolmuş');
    });

    it('bekleme süresindeyken (429) kod alanı açık kalır ve sunucunun süresiyle geri sayar', () => {
        api.requestCode.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 429, error: { code: 'SignupPhone.ResendTooSoon', retryAfterSeconds: 42 } }))
        );
        cmp.onPhoneChange('05321234567');
        cmp.sendCode();
        fixture.detectChanges();

        expect(cmp.step()).toBe('code');
        expect(cmp.resendIn()).toBe(42);
        expect(byTestId('signup-phone-status')?.textContent).toContain('Yeni kod için 42 saniye bekleyin.');
    });

    it('numarayla daha önce deneme açılmışsa sade mesaj gösterilir', () => {
        api.requestCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SignupPhone.DuplicateTrial' } })));
        cmp.onPhoneChange('05321234567');
        cmp.sendCode();
        fixture.detectChanges();

        expect(cmp.step()).toBe('phone');
        expect(byTestId('signup-phone-status')?.textContent).toContain('Bu telefon numarasıyla daha önce deneme hesabı açılmış.');
    });

    it('kod gönderildikten sonra numara değişirse kod adımı kapanır', () => {
        cmp.onPhoneChange('05321234567');
        cmp.sendCode();
        cmp.onPhoneChange('05321234568');
        fixture.detectChanges();

        expect(cmp.step()).toBe('phone');
        expect(cmp.resendIn()).toBe(0);
        expect(byTestId('signup-phone-code')).toBeNull();
    });
});
