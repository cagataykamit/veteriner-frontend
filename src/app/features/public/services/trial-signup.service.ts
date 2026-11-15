import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { OwnerSignupSettingsDto, SignupEmailCodeSentDto, SignupEmailVerifiedDto } from '@/app/features/public/models/trial-signup.model';

/** Deneme kaydı kötüye kullanım önlemleri (TRIAL-001): sunucu ayarları, e-posta kodu gönder ve doğrula. */
@Injectable({ providedIn: 'root' })
export class TrialSignupService {
    private readonly api = inject(ApiClient);
    private settings$: Observable<OwnerSignupSettingsDto> | null = null;

    settings(): Observable<OwnerSignupSettingsDto> {
        this.settings$ ??= this.api.get<OwnerSignupSettingsDto>(ApiEndpoints.public.ownerSignupSettings()).pipe(shareReplay({ bufferSize: 1, refCount: false }));

        return this.settings$;
    }

    requestEmailCode(email: string, turnstileToken: string | null): Observable<SignupEmailCodeSentDto> {
        return this.api.post<SignupEmailCodeSentDto>(ApiEndpoints.public.signupEmailCode(), { email, turnstileToken });
    }

    verifyEmailCode(email: string, oneTimeCode: string): Observable<SignupEmailVerifiedDto> {
        return this.api.post<SignupEmailVerifiedDto>(ApiEndpoints.public.signupEmailVerify(), { email, oneTimeCode });
    }
}
