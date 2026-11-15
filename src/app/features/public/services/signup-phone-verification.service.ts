import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { SignupPhoneCodeSentDto, SignupPhoneVerifiedDto } from '@/app/features/public/models/signup-phone-verification.model';

/** Deneme kaydı telefon doğrulaması (TRIAL-001): kod gönder ve doğrula. */
@Injectable({ providedIn: 'root' })
export class SignupPhoneVerificationService {
    private readonly api = inject(ApiClient);

    requestCode(mobilePhone: string): Observable<SignupPhoneCodeSentDto> {
        return this.api.post<SignupPhoneCodeSentDto>(ApiEndpoints.public.signupPhoneCode(), { mobilePhone });
    }

    verifyCode(mobilePhone: string, oneTimeCode: string): Observable<SignupPhoneVerifiedDto> {
        return this.api.post<SignupPhoneVerifiedDto>(ApiEndpoints.public.signupPhoneVerify(), { mobilePhone, oneTimeCode });
    }
}
