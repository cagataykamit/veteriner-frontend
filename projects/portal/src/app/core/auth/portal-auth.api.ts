import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import type { PortalAuthTokens, PortalMe } from './portal-auth.models';

/** Portal kimlik uçları (sözleşme §5.4–5.8). Yalnız HTTP; oturum durumu `PortalSessionService`'te. */
@Injectable({ providedIn: 'root' })
export class PortalAuthApi {
    private readonly api = inject(PortalApiClient);

    requestCode(email: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.requestCode, { email });
    }

    verifyCode(email: string, oneTimeCode: string): Observable<PortalAuthTokens> {
        return this.api.post<PortalAuthTokens>(PORTAL_ENDPOINTS.verifyCode, { email, oneTimeCode });
    }

    login(email: string, password: string): Observable<PortalAuthTokens> {
        return this.api.post<PortalAuthTokens>(PORTAL_ENDPOINTS.login, { email, password });
    }

    requestPasswordReset(email: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.passwordReset, { email });
    }

    confirmPasswordReset(email: string, oneTimeCode: string, newPassword: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.passwordResetConfirm, { email, oneTimeCode, newPassword });
    }

    refresh(refreshToken: string): Observable<PortalAuthTokens> {
        return this.api.post<PortalAuthTokens>(PORTAL_ENDPOINTS.refresh, { refreshToken });
    }

    logout(refreshToken: string | null): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.logout, { refreshToken });
    }

    logoutAll(): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.logoutAll);
    }

    me(): Observable<PortalMe> {
        return this.api.get<PortalMe>(PORTAL_ENDPOINTS.me);
    }
}
