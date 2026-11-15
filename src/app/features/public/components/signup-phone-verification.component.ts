import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { SignupPhoneVerification } from '@/app/features/public/models/signup-phone-verification.model';
import { SignupPhoneVerificationService } from '@/app/features/public/services/signup-phone-verification.service';
import {
    isSignupMobilePhone,
    SIGNUP_PHONE_CODE_LENGTH,
    SIGNUP_PHONE_INVALID_MESSAGE,
    signupPhoneErrorCode,
    signupPhoneFailureMessage,
    signupPhoneRetryAfterSeconds
} from '@/app/features/public/utils/signup-phone-verification.utils';

type Step = 'phone' | 'code' | 'verified';

/**
 * Deneme kaydı telefon doğrulaması (TRIAL-001): numara → "Kod gönder" → 6 haneli kod → doğrulandı. Tekrar gönderme sunucunun
 * verdiği süre kadar bekler (geri sayım). Doğrulanınca numara ve kayıt jetonu üst bileşene verilir; numara değişirse sıfırlanır.
 */
@Component({
    selector: 'app-signup-phone-verification',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputTextModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-2" data-testid="signup-phone">
            <label for="signupMobilePhone" class="block text-surface-900 dark:text-surface-0 font-medium">Cep telefonu *</label>
            <p class="text-sm text-muted-color m-0">Hesabınızı korumak için numaranıza tek kullanımlık kod göndereceğiz. Her numarayla bir deneme hesabı açılabilir.</p>

            @if (step() === 'verified') {
                <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2" data-testid="signup-phone-verified">
                    <span class="flex items-center gap-2 min-w-0">
                        <i class="pi pi-check-circle text-green-600 dark:text-green-400" aria-hidden="true"></i>
                        <span class="font-medium text-surface-900 dark:text-surface-0 break-all">{{ phone }}</span>
                        <span class="text-sm text-green-700 dark:text-green-400">doğrulandı</span>
                    </span>
                    <button type="button" class="public-brand-link text-sm bg-transparent border-0 p-0 cursor-pointer" [disabled]="disabled()" (click)="changePhone()">Numarayı değiştir</button>
                </div>
            } @else {
                <div class="flex flex-col sm:flex-row gap-2">
                    <input
                        pInputText
                        id="signupMobilePhone"
                        type="tel"
                        inputmode="tel"
                        autocomplete="tel"
                        placeholder="05XX XXX XX XX"
                        maxlength="20"
                        class="w-full sm:flex-1 min-w-0"
                        [disabled]="disabled() || sending()"
                        [ngModel]="phone"
                        (ngModelChange)="onPhoneChange($event)"
                        [attr.aria-invalid]="phoneError() ? true : null"
                        aria-describedby="signupPhoneStatus"
                        data-testid="signup-phone-input"
                    />
                    <button
                        pButton
                        type="button"
                        class="w-full sm:w-auto whitespace-nowrap"
                        [outlined]="step() === 'code'"
                        [disabled]="disabled() || sending() || resendIn() > 0"
                        (click)="sendCode()"
                        data-testid="signup-phone-send"
                    >
                        @if (sending()) {
                            <i class="p-button-icon pi pi-spin pi-spinner" aria-hidden="true"></i>
                        }
                        {{ sendLabel() }}
                    </button>
                </div>

                @if (step() === 'code') {
                    <label for="signupPhoneCode" class="block text-surface-900 dark:text-surface-0 font-medium mt-2">Telefonunuza gelen kod</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            pInputText
                            id="signupPhoneCode"
                            type="text"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            [attr.maxlength]="codeLength"
                            placeholder="6 haneli kod"
                            class="w-full sm:w-48 tracking-widest"
                            [disabled]="disabled() || verifying()"
                            [ngModel]="code"
                            (ngModelChange)="onCodeChange($event)"
                            aria-describedby="signupPhoneStatus"
                            data-testid="signup-phone-code"
                        />
                        <button pButton type="button" class="w-full sm:w-auto" [disabled]="disabled() || verifying() || code.length !== codeLength" (click)="verify()" data-testid="signup-phone-verify">
                            @if (verifying()) {
                                <i class="p-button-icon pi pi-spin pi-spinner" aria-hidden="true"></i>
                            }
                            Doğrula
                        </button>
                    </div>
                }
            }

            <small id="signupPhoneStatus" aria-live="polite" data-testid="signup-phone-status">
                @if (phoneError(); as error) {
                    <span class="text-danger" role="alert">{{ error }}</span>
                } @else if (step() === 'code') {
                    <span class="text-muted-color">Kod {{ phone }} numarasına gönderildi, 5 dakika geçerlidir.</span>
                }
            </small>
        </div>
    `
})
export class SignupPhoneVerificationComponent {
    readonly disabled = input(false);
    /** Doğrulanan numara ve jeton; numara değişince ya da sıfırlanınca `null`. */
    readonly verifiedChange = output<SignupPhoneVerification | null>();

    readonly codeLength = SIGNUP_PHONE_CODE_LENGTH;
    readonly step = signal<Step>('phone');
    readonly sending = signal(false);
    readonly verifying = signal(false);
    readonly phoneError = signal<string | null>(null);
    readonly resendIn = signal(0);
    readonly sendLabel = computed(() => {
        const wait = this.resendIn();

        if (wait > 0) {
            return `Yeniden gönder (${wait} sn)`;
        }

        return this.step() === 'code' ? 'Yeniden gönder' : 'Kod gönder';
    });

    phone = '';
    code = '';

    private readonly api = inject(SignupPhoneVerificationService);
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.stopTimer());
    }

    onPhoneChange(value: string): void {
        this.phone = value ?? '';
        this.phoneError.set(null);

        if (this.step() === 'code') {
            // Kod eski numaraya gitti; yeni numara için yeniden gönderilmeli.
            this.step.set('phone');
            this.code = '';
            this.resendIn.set(0);
            this.stopTimer();
        }
    }

    onCodeChange(value: string): void {
        this.code = (value ?? '').replace(/\D/g, '').slice(0, this.codeLength);
        this.phoneError.set(null);
    }

    sendCode(): void {
        if (this.sending() || this.resendIn() > 0) {
            return;
        }

        const phone = this.phone.trim();

        if (!isSignupMobilePhone(phone)) {
            this.phoneError.set(SIGNUP_PHONE_INVALID_MESSAGE);

            return;
        }

        this.phoneError.set(null);
        this.sending.set(true);
        this.api
            .requestCode(phone)
            .pipe(finalize(() => this.sending.set(false)))
            .subscribe({
                next: (res) => {
                    this.step.set('code');
                    this.code = '';
                    this.startCountdown(res.resendAfterSeconds);
                },
                error: (err: unknown) => {
                    const wait = signupPhoneRetryAfterSeconds(err);

                    if (signupPhoneErrorCode(err) === 'SignupPhone.ResendTooSoon' && wait) {
                        // Kod zaten gönderilmiş (ör. sayfa yenilendi): kod girişi açık kalır, bekleme sunucudan gelir.
                        this.step.set('code');
                        this.startCountdown(wait);
                    }

                    this.phoneError.set(signupPhoneFailureMessage(err, 'Kod gönderilemedi.'));
                }
            });
    }

    verify(): void {
        if (this.verifying() || this.code.length !== this.codeLength) {
            return;
        }

        const phone = this.phone.trim();

        this.verifying.set(true);
        this.api
            .verifyCode(phone, this.code)
            .pipe(finalize(() => this.verifying.set(false)))
            .subscribe({
                next: (res) => {
                    this.stopTimer();
                    this.resendIn.set(0);
                    this.step.set('verified');
                    this.phoneError.set(null);
                    this.verifiedChange.emit({ mobilePhone: phone, token: res.phoneVerificationToken });
                },
                error: (err: unknown) => this.phoneError.set(signupPhoneFailureMessage(err, 'Kod doğrulanamadı.'))
            });
    }

    changePhone(): void {
        this.reset();
    }

    /** Kayıt doğrulamayı reddederse (süre doldu, numara kullanılmış) üst bileşen baştan başlatır. */
    reset(message: string | null = null): void {
        this.stopTimer();
        this.resendIn.set(0);
        this.code = '';
        this.step.set('phone');
        this.phoneError.set(message);
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
