import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** Portal belge türü; backend `LegalDocumentCatalog` ile aynı (sözleşme §5.9). */
export type PortalLegalDocumentType = 'PortalTerms' | 'PortalPrivacy';

export interface PortalLegalDocumentVersion {
    readonly documentType: PortalLegalDocumentType;
    readonly version: string;
}

export interface PortalPendingClinicDisclosure {
    readonly linkId: string;
    readonly clinicId: string;
    readonly clinicName: string;
}

/** `GET/POST /me/legal-acceptances` yanıtı. */
export interface PortalAcceptanceStatus {
    readonly requiresAcceptance: boolean;
    readonly pendingDocuments: readonly PortalLegalDocumentVersion[];
    readonly pendingClinicDisclosures: readonly PortalPendingClinicDisclosure[];
}

/** `GET /links/{linkId}/clinic-disclosure`; yer tutucular sunucuda doldurulur. */
export interface PortalClinicDisclosure {
    readonly linkId: string;
    readonly clinicId: string;
    readonly clinicName: string;
    readonly text: string;
    readonly isDefault: boolean;
    readonly acknowledgedAtUtc: string | null;
}

/** Engel kalkar: bekleyen belge yok ve tüm aktif bağların aydınlatma metni onaylı. */
export function isAcceptanceComplete(status: PortalAcceptanceStatus): boolean {
    return !status.requiresAcceptance && status.pendingDocuments.length === 0 && status.pendingClinicDisclosures.length === 0;
}

@Injectable({ providedIn: 'root' })
export class PortalLegalApi {
    private readonly api = inject(PortalApiClient);

    /** Güncel portal belge sürümleri (anonim); sayfadaki sürüm numarasının tek kaynağı. */
    documents(): Observable<PortalLegalDocumentVersion[]> {
        return this.api.get<PortalLegalDocumentVersion[]>(PORTAL_ENDPOINTS.legalDocuments);
    }

    myAcceptances(): Observable<PortalAcceptanceStatus> {
        return this.api.get<PortalAcceptanceStatus>(PORTAL_ENDPOINTS.myLegalAcceptances);
    }

    accept(documents: readonly PortalLegalDocumentVersion[]): Observable<PortalAcceptanceStatus> {
        return this.api.post<PortalAcceptanceStatus>(PORTAL_ENDPOINTS.myLegalAcceptances, { documents });
    }

    clinicDisclosure(linkId: string): Observable<PortalClinicDisclosure> {
        return this.api.get<PortalClinicDisclosure>(PORTAL_ENDPOINTS.clinicDisclosure(linkId));
    }

    acknowledgeClinicDisclosure(linkId: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.acknowledgeClinicDisclosure(linkId));
    }
}
