import { HttpParams } from '@angular/common/http';
import type { ClientCreditApplyLine, ClientCreditApplyRequestDto, ClientCreditRefundMethod, ClientCreditRefundRequestDto } from '@/app/entities/client-credit/models/client-credit-api.model';
import type { CanonicalPaymentMethod } from '@/app/entities/payment/utils/payment-method.utils';

const REFUND_METHODS: Record<CanonicalPaymentMethod, ClientCreditRefundMethod> = {
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer'
};

/** Varsayılan yalnız açık krediler; `includeClosed` yalnız istendiğinde gönderilir. */
export function clientCreditsQueryToHttpParams(includeClosed: boolean): HttpParams | undefined {
    return includeClosed ? new HttpParams().set('includeClosed', 'true') : undefined;
}

export function mapClientCreditApplyToApiBody(clinicId: string | null | undefined, requestId: string, allocations: readonly ClientCreditApplyLine[]): ClientCreditApplyRequestDto {
    const clinic = clinicId?.trim();

    return {
        ...(clinic ? { clinicId: clinic } : {}),
        requestId: requestId.trim(),
        allocations: allocations.map((a) => ({ chargeId: a.chargeId.trim(), amount: a.amount }))
    };
}

/** Form yöntemi (cash/card/transfer) sözleşmedeki metin değere çevrilir. */
export function mapClientCreditRefundToApiBody(reason: string, method: CanonicalPaymentMethod): ClientCreditRefundRequestDto {
    return { reason: reason.trim(), method: REFUND_METHODS[method] };
}
