import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { SignupEmailVerification } from '@/app/features/public/models/trial-signup.model';
import { TrialSignupService } from '@/app/features/public/services/trial-signup.service';
import { SignupEmailVerificationComponent } from './signup-email-verification.component';

describe('SignupEmailVerificationComponent (TRIAL-001)', () => {
    let fixture: ComponentFixture<SignupEmailVerificationComponent>;
    let cmp: SignupEmailVerificationComponent;
    let api: MockedObject<TrialSignupService>;
    let emitted: (SignupEmailVerification | null)[];

    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const byTestId = <T extends HTMLElement>(id: string): T | null => host().querySelector<T>(`[data-testid="${id}"]`);

    beforeEach(async () => {
        vi.useFakeTimers();
        api = {
            settings: vi.fn(),
            requestEmailCode: vi.fn().mockReturnValue(of({ expiresInSeconds: 600, resendAfterSeconds: 60 })),
            verifyEmailCode: vi.fn().mockReturnValue(of({ emailVerificationToken: 'jeton', expiresAtUtc: '2026-11-15T10:30:00Z' }))
        } as unknown as MockedObject<TrialSignupService>;

        await TestBed.configureTestingModule({
            imports: [SignupEmailVerificationComponent],
            providers: [{ provide: TrialSignupService, useValue: api }]
        }).compileComponents();

        fixture = TestBed.createComponent(SignupEmailVerificationComponent);
        cmp = fixture.componentInstance;
        emitted = [];
        cmp.verifiedChange.subscribe((v) => emitted.push(v));
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('geçersiz adreste kod istemez', () => {
        cmp.onEmailChange('sahip@');
        cmp.sendCode();
        fixture.detectChanges();

        expect(api.requestEmailCode).not.toHaveBeenCalled();
        expect(byTestId('signup-email-status')?.textContent).toContain('Geçerli bir e-posta adresi girin.');
    });

    it('site anahtarı varken insan doğrulaması bitmeden kod gönderilemez; jetonla gönderilir', () => {
        fixture.componentRef.setInput('turnstileSiteKey', 'site-anahtari');
        cmp.onEmailChange('sahip@ornek.com');
        fixture.detectChanges();

        expect(byTestId<HTMLButtonElement>('signup-email-send')?.disabled).toBe(true);
        cmp.sendCode();
        expect(api.requestEmailCode).not.toHaveBeenCalled();

        cmp.turnstileToken.set('insan-jetonu');
        cmp.sendCode();

        expect(api.requestEmailCode).toHaveBeenCalledWith('sahip@ornek.com', 'insan-jetonu');
    });

    it('kod gönderince kod alanı açılır, 60 sn geri sayım biter ve yeniden gönderilebilir', () => {
        cmp.onEmailChange('sahip@ornek.com');
        cmp.sendCode();
        fixture.detectChanges();

        expect(api.requestEmailCode).toHaveBeenCalledWith('sahip@ornek.com', null);
        expect(byTestId('signup-email-code')).not.toBeNull();
        expect(byTestId('signup-email-send')?.textContent).toContain('Yeniden gönder (60 sn)');

        vi.advanceTimersByTime(60_000);
        fixture.detectChanges();

        expect(byTestId<HTMLButtonElement>('signup-email-send')?.disabled).toBe(false);
        expect(byTestId('signup-email-send')?.textContent?.trim()).toBe('Yeniden gönder');
    });

    it('doğru kodla adres ve jeton üst bileşene verilir; adres değiştirilince sıfırlanır', () => {
        cmp.onEmailChange('sahip@ornek.com');
        cmp.sendCode();
        cmp.onCodeChange('12 34 56x');
        cmp.verify();
        fixture.detectChanges();

        expect(api.verifyEmailCode).toHaveBeenCalledWith('sahip@ornek.com', '123456');
        expect(emitted).toEqual([{ email: 'sahip@ornek.com', token: 'jeton' }]);
        expect(byTestId('signup-email-verified')?.textContent).toContain('doğrulandı');

        cmp.reset();
        fixture.detectChanges();

        expect(emitted.at(-1)).toBeNull();
        expect(byTestId('signup-email-input')).not.toBeNull();
    });

    it('adresle daha önce deneme açılmışsa ya da insan doğrulaması geçmezse sade mesaj gösterilir', () => {
        api.requestEmailCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SignupIdentity.DuplicateEmail' } })));
        cmp.onEmailChange('sahip@ornek.com');
        cmp.sendCode();
        fixture.detectChanges();

        expect(cmp.step()).toBe('email');
        expect(byTestId('signup-email-status')?.textContent).toContain('Bu e-posta adresiyle daha önce deneme hesabı açılmış.');

        api.requestEmailCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'HumanVerification.Failed' } })));
        cmp.sendCode();
        fixture.detectChanges();

        expect(byTestId('signup-email-status')?.textContent).toContain('Güvenlik doğrulaması tamamlanamadı.');
    });

    it('bekleme süresindeyken (429) kod alanı açık kalır ve sunucunun süresiyle geri sayar', () => {
        api.requestEmailCode.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 429, error: { code: 'SignupEmail.ResendTooSoon', retryAfterSeconds: 42 } }))
        );
        cmp.onEmailChange('sahip@ornek.com');
        cmp.sendCode();
        fixture.detectChanges();

        expect(cmp.step()).toBe('code');
        expect(cmp.resendIn()).toBe(42);
        expect(byTestId('signup-email-status')?.textContent).toContain('Yeni kod için 42 saniye bekleyin.');
    });

    it('hatalı kodda sunucu mesajı gösterilir; adres değişirse kod adımı kapanır', () => {
        api.verifyEmailCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'SignupEmail.CodeInvalid' } })));
        cmp.onEmailChange('sahip@ornek.com');
        cmp.sendCode();
        cmp.onCodeChange('000000');
        cmp.verify();
        fixture.detectChanges();

        expect(emitted).toEqual([]);
        expect(byTestId('signup-email-status')?.textContent).toContain('Kod hatalı ya da süresi dolmuş');

        cmp.onEmailChange('baska@ornek.com');
        fixture.detectChanges();

        expect(cmp.step()).toBe('email');
        expect(byTestId('signup-email-code')).toBeNull();
    });
});
