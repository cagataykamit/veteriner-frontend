import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `POST /marketing-opt-out/preview` (ADR-046): klinik adı ve onayın sürüp sürmediği; durum değişmez. */
export interface PortalMarketingOptOutPage {
    readonly clinicName: string;
    readonly isOptedOut: boolean;
}

/** Ticari iletideki ret bağlantısı. Token gövdede gider; yolda ve günlükte görünmez. Bağlantı tek kullanımlık değildir. */
@Injectable({ providedIn: 'root' })
export class PortalMarketingOptOutApi {
    private readonly api = inject(PortalApiClient);

    preview(token: string): Observable<PortalMarketingOptOutPage> {
        return this.api.post<PortalMarketingOptOutPage>(PORTAL_ENDPOINTS.marketingOptOutPreview, { token });
    }

    confirm(token: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.marketingOptOutConfirm, { token });
    }
}
