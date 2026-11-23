import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, Observable, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { safeReturnUrl } from '@portal/app/core/auth/portal-auth.guards';
import type { PortalAuthTokens } from '@portal/app/core/auth/portal-auth.models';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_CODE_INVALID_MESSAGE, PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES, portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { normalizeOneTimeCode, portalEmailValidators, portalFieldError, portalOneTimeCodeValidator } from '@portal/app/shared/validation/portal-form-rules';
import { HUMAN_CHECK_PENDING_MESSAGE, PORTAL_TURNSTILE_ACTIONS, PortalHumanVerificationService } from '@portal/app/core/security/portal-human-verification.service';
import { PortalTurnstileComponent } from '@portal/app/shared/ui/portal-turnstile.component';
import { PortalResendTimer } from './portal-resend-timer';

type LoginMethod = 'code' | 'password';

/** Sunucu kod/parola/kilit ayrımı yapmaz (numaralandırma koruması, sözleşme §3); mesaj da ayırt etmez (kod için PORTAL_CODE_INVALID_MESSAGE). */
export const LOGIN_PASSWORD_INVALID_MESSAGE =
    'E-posta veya parola hatalı. Çok sayıda hatalı denemeden sonra giriş geçici olarak kilitlenir; kodla giriş yapabilir ya da parolanızı sıfırlayabilirsiniz.';
export const PORTAL_ACCOUNT_DELETED_MESSAGE = 'Hesabınız silindi. Silme onayı e-posta adresinize gönderildi.';
const ONE_TIME_CODE_LENGTH = 6;

export const LOGIN_CODE_SENT_MESSAGE = 'Bu e-posta adresiyle bir hesap varsa 6 haneli giriş kodu gönderildi. Kod 10 dakika geçerlidir.';

/**
 * Giriş (ADR-031 AK-2: ikisi birden): e-posta + tek kullanımlık kod (§5.4) veya e-posta + parola (§5.5).
 * Başarıda dönüş adresine, yoksa ana sayfaya; kabul ve klinik seçimi guard'larla istenir.
 */
@Component({
    selector: 'portal-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, PortalBrandHeader, PortalFooter, PortalTurnstileComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-login.component.html'
})
export class PortalLoginComponent {
    private readonly authApi = inject(PortalAuthApi);
    private readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    readonly returnUrl = input<string | undefined>();
    /** `?reason=expired`: oturum süresi dolduğu için yönlendirildi; `?reason=deleted`: hesap silindi (§5.10). */
    readonly reason = input<string | undefined>();

    readonly method = signal<LoginMethod>('code');
    readonly codeSent = signal(false);
    readonly busy = signal(false);
    readonly submitted = signal(false);
    readonly error = signal<string | null>(null);
    readonly info = signal<string | null>(null);
    readonly resend = new PortalResendTimer(inject(DestroyRef));

    /** İnsan doğrulaması (Turnstile): site anahtarı sunucudan; boşsa widget yok ve kod jetonsuz istenir. */
    readonly turnstileSiteKey = toSignal(inject(PortalHumanVerificationService).siteKey(), { initialValue: null });
    readonly turnstileToken = signal<string | null>(null);
    readonly turnstileAction = PORTAL_TURNSTILE_ACTIONS.signInCode;
    private readonly turnstile = viewChild(PortalTurnstileComponent);
    private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

    readonly expiredMessage = computed(() => (this.reason() === 'expired' ? PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.invalidRefreshToken] : null));
    readonly deletedMessage = computed(() => (this.reason() === 'deleted' ? PORTAL_ACCOUNT_DELETED_MESSAGE : null));

    readonly form = new FormGroup({
        email: new FormControl('', { nonNullable: true, validators: portalEmailValidators }),
        // Alanlar yönteme göre doğrulanır (`validate`); gizli alanın hatası formu engellemez.
        code: new FormControl('', { nonNullable: true, validators: [Validators.required, portalOneTimeCodeValidator()] }),
        password: new FormControl('', { nonNullable: true, validators: Validators.required })
    });

    constructor() {
        // Kod istenince odak kod alanına geçer; 6 hane girilince kendiliğinden doğrulanır (H16).
        effect(() => this.codeInput()?.nativeElement.focus());
        this.form.controls.code.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
            if (this.method() === 'code' && this.codeSent() && !this.busy() && normalizeOneTimeCode(value).length === ONE_TIME_CODE_LENGTH && this.form.controls.code.valid) {
                this.verifyCode();
            }
        });
    }

    selectMethod(method: LoginMethod): void {
        if (this.method() === method) {
            return;
        }

        this.method.set(method);
        this.codeSent.set(false);
        this.submitted.set(false);
        this.error.set(null);
        this.info.set(null);
        this.form.controls.code.reset('');
        this.form.controls.password.reset('');
    }

    fieldError(name: 'email' | 'code' | 'password'): string | null {
        const control = this.form.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
        }

        return portalFieldError(control.errors, name);
    }

    submit(): void {
        if (this.method() === 'password') {
            this.signInWithPassword();
        } else if (this.codeSent()) {
            this.verifyCode();
        } else {
            this.requestCode();
        }
    }

    requestCode(): void {
        if (!this.validate(['email']) || !this.resend.canSend()) {
            return;
        }

        if (this.turnstileSiteKey() && !this.turnstileToken()) {
            this.error.set(HUMAN_CHECK_PENDING_MESSAGE);

            return;
        }

        // Turnstile jetonu tek kullanımlık: her istekten sonra yenilenir.
        const request = this.authApi.requestCode(this.email(), this.turnstileToken()).pipe(finalize(() => this.turnstile()?.reset()));

        this.run(request, () => {
            this.codeSent.set(true);
            this.submitted.set(false);
            this.info.set(LOGIN_CODE_SENT_MESSAGE);
            this.resend.start();
        });
    }

    changeEmail(): void {
        this.codeSent.set(false);
        this.info.set(null);
        this.error.set(null);
        this.form.controls.code.reset('');
    }

    private verifyCode(): void {
        if (!this.validate(['email', 'code'])) {
            return;
        }

        const code = normalizeOneTimeCode(this.form.controls.code.value);

        this.signIn(this.authApi.verifyCode(this.email(), code), PORTAL_CODE_INVALID_MESSAGE);
    }

    private signInWithPassword(): void {
        if (!this.validate(['email', 'password'])) {
            return;
        }

        this.signIn(this.authApi.login(this.email(), this.form.controls.password.value), LOGIN_PASSWORD_INVALID_MESSAGE);
    }

    private signIn(request: Observable<PortalAuthTokens>, invalidMessage: string): void {
        this.run(
            request.pipe(switchMap((tokens) => this.session.startSession(tokens))),
            () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl()) ?? '/', { replaceUrl: true }),
            { [PORTAL_ERROR_CODES.invalidCredentials]: invalidMessage }
        );
    }

    private run<T>(request: Observable<T>, onSuccess: () => void, overrides: Record<string, string> = {}): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        request.subscribe({
            next: () => {
                this.busy.set(false);
                onSuccess();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err, overrides));
            }
        });
    }

    private validate(fields: readonly ('email' | 'code' | 'password')[]): boolean {
        this.submitted.set(true);
        fields.forEach((f) => this.form.controls[f].markAsTouched());

        return fields.every((f) => this.form.controls[f].valid);
    }

    private email(): string {
        return this.form.controls.email.value.trim();
    }
}
