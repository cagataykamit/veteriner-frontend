import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import type { DiscountCodeValidationDto, SubscriptionDiscountDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { DISCOUNT_CODE_INVALID_MESSAGE } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const DISCOUNT_CODE_PROBLEM_MESSAGES: Record<string, string> = {
    'DiscountCodes.Invalid': DISCOUNT_CODE_INVALID_MESSAGE,
    'DiscountCodes.DuplicateRedemption': 'Kurumunuz için zaten bir ortak kodu kullanılmış.',
    'DiscountCodes.ApplyNotOpen': 'Ortak kodu yalnız kayıtta ya da ilk ücretli ödemeden önce girilebilir.'
};

/** Satış ortağı kodu hata metni (kayıt ve abonelik akışı ortak). */
export function discountCodeErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) {
        return err instanceof Error ? err.message : fallback;
    }

    const code = problemCodeFromHttpError(err);

    return (code && DISCOUNT_CODE_PROBLEM_MESSAGES[code]) || messageFromHttpError(err, fallback);
}

/** Müşteri tarafı kod uçları: anonim doğrulama ve kiracının abonelik kodu (ADR-037). */
@Injectable({ providedIn: 'root' })
export class DiscountCodesService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Her zaman 200; geçersizde `valid=false` (tek tip). 429'da hata fırlar. */
    validate(code: string): Observable<DiscountCodeValidationDto> {
        return this.api.post<DiscountCodeValidationDto>(ApiEndpoints.public.validateDiscountCode(), { code });
    }

    getSubscriptionDiscount(): Observable<SubscriptionDiscountDto> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        if (!tenantId) {
            return throwError(() => new Error('Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }

        return this.api
            .get<SubscriptionDiscountDto>(ApiEndpoints.tenants.subscriptionDiscount(tenantId))
            .pipe(catchError((err: unknown) => throwError(() => new Error(discountCodeErrorMessage(err, 'Ortak kodu bilgisi yüklenemedi.')))));
    }

    applySubscriptionDiscount(code: string): Observable<SubscriptionDiscountDto> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        if (!tenantId) {
            return throwError(() => new Error('Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }

        return this.api
            .post<SubscriptionDiscountDto>(ApiEndpoints.tenants.subscriptionDiscount(tenantId), { code })
            .pipe(catchError((err: unknown) => throwError(() => new Error(discountCodeErrorMessage(err, 'Ortak kodu uygulanamadı.')))));
    }
}
