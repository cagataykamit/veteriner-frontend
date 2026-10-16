import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import type { PortalAuthTokens } from '@portal/app/core/auth/portal-auth.models';
import type { PortalLegalDocumentVersion } from '@portal/app/features/legal/portal-legal.api';

/** `GET /invites/{token}` (sözleşme §5.2). */
export interface PortalInvitePreview {
    readonly clinicName: string;
    readonly emailMasked: string;
    readonly expiresAtUtc: string;
    readonly hasAccount: boolean;
    readonly requiredLegalDocuments: readonly PortalLegalDocumentVersion[];
}

/** `POST /invites/{token}/accept` gövdesi (§5.3). `password` yoksa hesap kodla giriş yapar. */
export interface PortalAcceptInviteRequest {
    readonly displayName?: string;
    readonly password?: string;
    readonly acceptedLegalDocuments: readonly PortalLegalDocumentVersion[];
}

export interface PortalAcceptInviteResponse extends PortalAuthTokens {
    readonly linkId: string;
}

@Injectable({ providedIn: 'root' })
export class PortalInviteApi {
    private readonly api = inject(PortalApiClient);

    preview(token: string): Observable<PortalInvitePreview> {
        return this.api.get<PortalInvitePreview>(PORTAL_ENDPOINTS.invite(token));
    }

    accept(token: string, body: PortalAcceptInviteRequest): Observable<PortalAcceptInviteResponse> {
        return this.api.post<PortalAcceptInviteResponse>(PORTAL_ENDPOINTS.acceptInvite(token), body);
    }
}
