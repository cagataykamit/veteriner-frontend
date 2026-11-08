import type { HttpErrorResponse } from '@angular/common/http';
import { mapSubscriptionPlanFitDtoToVm } from '@/app/entities/subscription/data/subscription.mapper';
import type { SubscriptionPlanFitDto } from '@/app/entities/subscription/models/subscription-api.model';
import type { SubscriptionPlanFitVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Backend `Subscriptions.CheckoutAlreadyPaid`: açık oturumun ödemesi sağlayıcıda alınmış ve aboneliğe işlenmiş. */
export const CHECKOUT_ALREADY_PAID_CODE = 'Subscriptions.CheckoutAlreadyPaid';

/** Backend `Subscriptions.PlanLimitsExceeded` (409): aktif klinik ve kullanıcı sayısı hedef pakete sığmıyor (ADR-035 2026-11-08). */
export const PLAN_LIMITS_EXCEEDED_CODE = 'Subscriptions.PlanLimitsExceeded';

/** Ödeme başlatılırken önceki ödemenin işlendiği anlaşıldı; ekran hata değil bilgi gösterir ve özeti yeniler. */
export class CheckoutAlreadyPaidError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CheckoutAlreadyPaidError';
    }
}

/** Paket değişimi hedef pakete sığmıyor; ekran sınırları, sayıları ve yapılacakları gösterir. */
export class PlanLimitsExceededError extends Error {
    constructor(
        message: string,
        readonly fit: SubscriptionPlanFitVm
    ) {
        super(message);
        this.name = 'PlanLimitsExceededError';
    }
}

/** Hata `PlanLimitsExceeded` ise sığma bilgisiyle hata, değilse `null`. Alanlar `ProblemDetails` üst düzeyindedir. */
export function planLimitsExceededFromHttpError(err: HttpErrorResponse, message: string): PlanLimitsExceededError | null {
    if (problemCodeFromHttpError(err) !== PLAN_LIMITS_EXCEEDED_CODE) {
        return null;
    }

    const body = err.error && typeof err.error === 'object' ? (err.error as SubscriptionPlanFitDto) : null;
    const fit = mapSubscriptionPlanFitDtoToVm(body);

    return fit ? new PlanLimitsExceededError(message, fit) : null;
}
