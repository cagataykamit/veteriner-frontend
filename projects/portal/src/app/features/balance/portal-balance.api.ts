import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PortalPage, portalPageParams } from '@portal/app/core/api/portal-page';

/**
 * `GET /links/{linkId}/balance` (sözleşme §6.5): bağın kliniğiyle sınırlı, yalnız tutar (AK-9, online ödeme yok).
 * `outstanding` = `totalCharged` − `totalPaid`; `unallocatedPaymentsAmount` ondan düşülmez.
 */
export interface PortalBalance {
    readonly clinicId: string;
    readonly currency: string;
    readonly totalCharged: number;
    readonly totalPaid: number;
    readonly outstanding: number;
    readonly unallocatedPaymentsAmount: number;
    readonly lastPaymentAtUtc: string | null;
}

export type PortalPaymentMethod = 'Cash' | 'Card' | 'Transfer';

/** Ödeme satırı: yalnız tarih/tutar/yöntem. */
export interface PortalPayment {
    readonly paidAtUtc: string;
    readonly amount: number;
    readonly currency: string;
    readonly method: PortalPaymentMethod;
}

/** Kalan borç var mı; sıfır ve altı "borç yok" sayılır. */
export function hasOutstanding(balance: PortalBalance): boolean {
    return balance.outstanding > 0;
}

@Injectable({ providedIn: 'root' })
export class PortalBalanceApi {
    private readonly api = inject(PortalApiClient);

    balance(linkId: string): Observable<PortalBalance> {
        return this.api.get<PortalBalance>(PORTAL_ENDPOINTS.balance(linkId));
    }

    payments(linkId: string, page: number): Observable<PortalPage<PortalPayment>> {
        return this.api.get<PortalPage<PortalPayment>>(PORTAL_ENDPOINTS.payments(linkId), portalPageParams(page));
    }
}
