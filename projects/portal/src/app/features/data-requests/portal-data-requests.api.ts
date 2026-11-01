import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** Talep metni sınırı (sözleşme §11.1: 1–2000). */
export const PORTAL_DATA_REQUEST_MESSAGE_MAX = 2000;

export type PortalDataRequestType = 'Access' | 'Rectification' | 'Erasure' | 'Objection' | 'Other';
export type PortalDataRequestStatus = 'Open' | 'InProgress' | 'Completed' | 'Rejected' | 'Cancelled';

/** `PortalDataRequestDto` (sözleşme §11.1): bağın KVKK başvurusu; en yeni önce. */
export interface PortalDataRequest {
    readonly id: string;
    readonly type: PortalDataRequestType;
    readonly status: PortalDataRequestStatus;
    readonly message: string;
    readonly createdAtUtc: string;
    /** Kliniğin yanıt vermesi gereken son gün (oluşturmadan 30 gün sonra). */
    readonly dueAtUtc: string;
    readonly respondedAtUtc: string | null;
    readonly responseNote: string | null;
    /** Yalnız `Open` talep geri çekilebilir. */
    readonly canCancel: boolean;
}

@Injectable({ providedIn: 'root' })
export class PortalDataRequestsApi {
    private readonly api = inject(PortalApiClient);

    list(linkId: string): Observable<PortalDataRequest[]> {
        return this.api.get<PortalDataRequest[]>(PORTAL_ENDPOINTS.dataRequests(linkId));
    }

    create(linkId: string, type: PortalDataRequestType, message: string): Observable<PortalDataRequest> {
        return this.api.post<PortalDataRequest>(PORTAL_ENDPOINTS.dataRequests(linkId), { type, message });
    }

    cancel(linkId: string, id: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.cancelDataRequest(linkId, id));
    }
}
