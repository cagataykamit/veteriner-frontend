import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SIGNUP_EMAIL_CODE_ACTION, type SignupEmailVerification } from '@/app/features/public/models/trial-signup.model';
import { TrialSignupService } from '@/app/features/public/services/trial-signup.service';
import { SIGNUP_EMAIL_CODE_LENGTH, trialSignupErrorCode, trialSignupFailureMessage, trialSignupRetryAfterSeconds } from '@/app/features/public/utils/trial-signup.utils';
import { TurnstileWidgetComponent } from '@/app/shared/security/turnstile-widget.component';

type Step = 'email' | 'code' | 'verified';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deneme kaydı e-posta doğrulaması (TRIAL-001): e-posta → "Kod gönder" (Turnstile ile) → 6 haneli kod → doğrulandı. Yeniden gönderme
 * sunucunun verdiği süre kadar bekler. Doğrulanınca adres ve kayıt jetonu üst bileşene verilir; adres değişirse sıfırlanır.
 */
@Component({
    selector: 'app-signup-email-verification',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule, TurnstileWidgetComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-2" data-testid="signup-email">
            <label for="email" class="block text-surface-900 dark:text-surface-0 font-medium">Yetkili e-posta *</label>

            @if (step() === 'verified') {
                <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2" data-testid="signup-email-verified">
                    <span class="flex items-center gap-2 min-w-0">
                        <i class="pi pi-check-circle text-green-600 dark:text-green-400" aria-hidden="true"></i>
                        <span class="font-medium text-surface-900 dark:text-surface-0 break-all">{{ email }}</span>
                        <span class="text-sm text-green-700 dark:text-green-400">doğrulandı</span>
                    </span>
                    <button type="button" class="public-brand-link text-sm bg-transparent border-0 p-0 cursor-pointer" [disabled]="disabled()" (click)="reset()">Adresi değiştir</button>
                </div>
            } @else {
                <p class="text-sm text-muted-color m-0">Adresinize tek kullanımlık bir kod göndereceğiz. Her e-posta adresiyle bir deneme hesabı açılabilir.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input
                        pInputText
                        id="email"
                        type="email"
                        autocomplete="email"
                        maxlength="200"
                        class="w-full sm:flex-1 min-w-0"
                        [disabled]="disabled() || sending()"
                        [ngModel]="email"
                        (ngModelChange)="onEmailChange($event)"
                        [attr.aria-invalid]="error() ? true : null"
                        aria-describedby="signupEmailStatus"
                        data-testid="signup-email-input"
                    />
                    <button
                        pButton
                        type="button"
                        class="w-full sm:w-auto whitespace-nowrap"
                        [outlined]="step() === 'code'"
                        [disabled]="disabled() || sending() || resendIn() > 0 || waitingForHumanCheck()"
                        (click)="sendCode()"
                        data-testid="signup-email-send"
                    >
                        @if (sending()) {
                            <i class="p-button-icon pi pi-spin pi-spinner" aria-hidden="true"></i>
                        }
                        {{ sendLabel() }}
                    </button>
                </div>
                <app-turnstile-widget [siteKey]="turnstileSiteKey()" [action]="turnstileAction" (tokenChange)="turnstileToken.set($event)" />

                @if (step() === 'code') {
                    <label for="signupEmailCode" class="block text-surface-900 dark:text-surface-0 font-medium mt-2">E-postanıza gelen kod</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            pInputText
                            id="signupEmailCode"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            [attr.maxlength]="codeLength"
                            placeholder="6 haneli kod"
                            class="w-full sm:w-48 tracking-widest"
                            [disabled]="disabled() || verifying()"
                            [ngModel]="code"
                            (ngModelChange)="onCodeChange($event)"
                            aria-describedby="signupEmailStatus"
                            data-testid="signup-email-code"
                        />
                        <button pButton type="button" class="w-full sm:w-auto" [disabled]="disabled() || verifying() || code.length !== codeLength" (click)="verify()" data-testid="signup-email-verify">
                            @if (verifying()) {
                                <i class="p-button-icon pi pi-spin pi-spinner" aria-hidden="true"></i>
                            }
                            Doğrula
                        </button>
                    </div>
                }
            }

            <small id="signupEmailStatus" aria-live="polite" data-testid="signup-email-status">
                @if (error(); as message) {
                    <span class="text-danger" role="alert">{{ message }}</span>
                } @else if (step() === 'code') {
                    <span class="text-muted-color">Kod {{ email }} adresine gönderildi, 10 dakika geçerlidir. Gelen kutusunda yoksa gereksiz klasörüne bakın.</span>
                }
            </small>
        </div>
    `
})
export class SignupEmailVerificationComponent {
    readonly disabled = input(false);
    /** Sunucudan gelen Turnstile site anahtarı; boşsa widget çizilmez ve kod jetonsuz istenir (yerel geliştirme). */
    readonly turnstileSiteKey = input<string | null>(null);
    /** Doğrulanan adres ve jeton; adres değişince ya da sıfırlanınca `null`. */
    readonly verifiedChange = output<SignupEmailVerification | null>();

    readonly codeLength = SIGNUP_EMAIL_CODE_LENGTH;
    readonly turnstileAction = SIGNUP_EMAIL_CODE_ACTION;
    readonly step = signal<Step>('email');
    readonly sending = signal(false);
    readonly verifying = signal(false);
    readonly error = signal<string | null>(null);
    readonly resendIn = signal(0);
    readonly turnstileToken = signal<string | null>(null);
    readonly waitingForHumanCheck = computed(() => !!this.turnstileSiteKey() && !this.turnstileToken());
    readonly sendLabel = computed(() => {
        const wait = this.resendIn();

        if (wait > 0) {
            return `Yeniden gönder (${wait} sn)`;
        }

        return this.step() === 'code' ? 'Yeniden gönder' : 'Kod gönder';
    });

    email = '';
    code = '';

    private readonly api = inject(TrialSignupService);
    private readonly turnstile = viewChild(TurnstileWidgetComponent);
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.stopTimer());
    }

    onEmailChange(value: string): void {
        this.email = value ?? '';
        this.error.set(null);

        if (this.step() === 'code') {
            // Kod eski adrese gitti; yeni adres için yeniden gönderilmeli.
            this.step.set('email');
            this.code = '';
            this.resendIn.set(0);
            this.stopTimer();
        }
    }

    onCodeChange(value: string): void {
        this.code = (value ?? '').replace(/\D/g, '').slice(0, this.codeLength);
        this.error.set(null);
    }

    sendCode(): void {
        if (this.sending() || this.resendIn() > 0 || this.waitingForHumanCheck()) {
            return;
        }

        const email = this.email.trim();

        if (!EMAIL_PATTERN.test(email)) {
            this.error.set('Geçerli bir e-posta adresi girin.');

            return;
        }

        this.error.set(null);
        this.sending.set(true);
        this.api
            .requestEmailCode(email, this.turnstileToken())
            .pipe(
                finalize(() => {
                    this.sending.set(false);
                    // Turnstile jetonu tek kullanımlık: her istekten sonra yenilenir.
                    this.turnstile()?.reset();
                })
            )
            .subscribe({
                next: (res) => {
                    this.step.set('code');
                    this.code = '';
                    this.startCountdown(res.resendAfterSeconds);
                },
                error: (err: unknown) => {
                    const wait = trialSignupRetryAfterSeconds(err);

                    if (trialSignupErrorCode(err) === 'SignupEmail.ResendTooSoon' && wait) {
                        // Kod zaten gönderilmiş (ör. sayfa yenilendi): kod girişi açık kalır, bekleme sunucudan gelir.
                        this.step.set('code');
                        this.startCountdown(wait);
                    }

                    this.error.set(trialSignupFailureMessage(err, 'Kod gönderilemedi.'));
                }
            });
    }

    verify(): void {
        if (this.verifying() || this.code.length !== this.codeLength) {
            return;
        }

        const email = this.email.trim();

        this.verifying.set(true);
        this.api
            .verifyEmailCode(email, this.code)
            .pipe(finalize(() => this.verifying.set(false)))
            .subscribe({
                next: (res) => {
                    this.stopTimer();
                    this.resendIn.set(0);
                    this.step.set('verified');
                    this.error.set(null);
                    this.verifiedChange.emit({ email, token: res.emailVerificationToken });
                },
                error: (err: unknown) => this.error.set(trialSignupFailureMessage(err, 'Kod doğrulanamadı.'))
            });
    }

    /** Adres değişti ya da kayıt doğrulamayı reddetti (süre doldu, adres kullanılmış): baştan başlar. */
    reset(message: string | null = null): void {
        this.stopTimer();
        this.resendIn.set(0);
        this.code = '';
        this.step.set('email');
        this.error.set(message);
        this.verifiedChange.emit(null);
    }

    private startCountdown(seconds: number): void {
        this.stopTimer();
        this.resendIn.set(Math.max(0, Math.ceil(seconds)));
        this.timer = setInterval(() => {
            const next = this.resendIn() - 1;

            this.resendIn.set(Math.max(0, next));

            if (next <= 0) {
                this.stopTimer();
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
