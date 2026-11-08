import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { clientCreditsQueryToHttpParams, mapClientCreditApplyToApiBody, mapClientCreditRefundToApiBody } from '@/app/entities/client-credit/data/client-credit.mapper';
import type { ClientCreditApplyLine, ClientCreditApplyResultDto, ClientCreditDto } from '@/app/entities/client-credit/models/client-credit-api.model';
import { CLIENT_CREDIT_PROBLEM_MESSAGES } from '@/app/entities/client-credit/utils/client-credit-error.utils';
import type { CanonicalPaymentMethod } from '@/app/entities/payment/utils/payment-method.utils';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Müşteri kredisi (FIN-005, `CLIENT_CREDIT_API_CONTRACT.md`); klinik kapsamı bakiye ucuyla aynı (context-first). */
@Injectable({ providedIn: 'root' })
export class ClientCreditsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** `Charges.Read` — oluşturma zamanı azalan; varsayılan yalnız açık krediler. */
    getCredits(clientId: string, includeClosed = false): Observable<ClientCreditDto[]> {
        return this.api.get<ClientCreditDto[]>(ApiEndpoints.clients.credits(clientId), clientCreditsQueryToHttpParams(includeClosed)).pipe(toUserError('Müşteri kredileri yüklenemedi.', CLIENT_CREDIT_PROBLEM_MESSAGES));
    }

    /**
     * `Payments.Create` — seçilen ücretleri krediden kapatır (en eski kredi önce; ödeme oluşmaz). `requestId` form başına bir kez üretilir.
     * HTTP hatası ham iletilir: çağıran `PaymentAllocations.ExceedsOutstanding` / `ClientCredits.*` koduna göre bakiyeyi yeniden okur.
     */
    applyCredit(clientId: string, requestId: string, allocations: readonly ClientCreditApplyLine[]): Observable<ClientCreditApplyResultDto> {
        return this.api.post<ClientCreditApplyResultDto>(ApiEndpoints.clients.creditsApply(clientId), mapClientCreditApplyToApiBody(this.auth.getClinicId(), requestId, allocations));
    }

    /** `Payments.Correct` — mahsubu geri alır; kredi kalanı ve ücretin açık tutarı geri gelir. 204. */
    reverseApplication(clientId: string, applicationId: string, reason: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.clients.creditApplicationReverse(clientId, applicationId), { reason: reason.trim() }).pipe(
            map(() => void 0),
            toUserError('Mahsup geri alınamadı.', CLIENT_CREDIT_PROBLEM_MESSAGES)
        );
    }

    /** `Payments.Correct` — kalan kredinin tamamı iade edilir (kasadan çıkış); kredi kapanır. */
    refundCredit(clientId: string, creditId: string, reason: string, method: CanonicalPaymentMethod, cashRegisterId: string | null = null): Observable<ClientCreditDto> {
        return this.api.post<ClientCreditDto>(ApiEndpoints.clients.creditRefund(clientId, creditId), mapClientCreditRefundToApiBody(reason, method, cashRegisterId)).pipe(toUserError('Kredi iade edilemedi.', CLIENT_CREDIT_PROBLEM_MESSAGES));
    }
}
