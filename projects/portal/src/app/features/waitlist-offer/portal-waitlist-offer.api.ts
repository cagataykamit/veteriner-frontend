import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `POST /waitlist-offer/preview` (WAITLIST_API_CONTRACT.md §4): asgari veri, durum değişmez. */
export interface PortalWaitlistOfferPage {
    readonly clinicName: string;
    readonly scheduledAtUtc: string;
    readonly durationMinutes: number;
    readonly petName: string;
    /** Teklifin bitişi; sonra sıradaki kişiye geçer. */
    readonly expiresAtUtc: string;
}

/** Bekleme listesi teklifi (TIER-018). Token gövdede gider; yolda ve günlükte görünmez. */
@Injectable({ providedIn: 'root' })
export class PortalWaitlistOfferApi {
    private readonly api = inject(PortalApiClient);

    preview(token: string): Observable<PortalWaitlistOfferPage> {
        return this.api.post<PortalWaitlistOfferPage>(PORTAL_ENDPOINTS.waitlistOfferPreview, { token });
    }

    accept(token: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.waitlistOfferAccept, { token });
    }

    decline(token: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.waitlistOfferDecline, { token });
    }
}
