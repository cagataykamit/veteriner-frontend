import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { PortalSessionExpiredError, PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { PORTAL_API_BASE_URL, portalApiRelativePath } from './portal-api.client';
import { isAnonymousPortalPath } from './portal-endpoints';

function withBearer<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Portal `PortalBearer` (sözleşme §1):
 * - Yalnız portal API köküne giden oturumlu isteklere Bearer ekler; anonim uçlara ve başka adreslere eklemez.
 * - 401'de refresh'i **bir kez** dener ve isteği yeni access token'la tekrarlar.
 * - Yenileme reddedilir ya da tekrar 401 gelirse yerel oturum silinir, girişe yönlendirilir.
 */
export const portalAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const relativePath = portalApiRelativePath(inject(PORTAL_API_BASE_URL), req.url);

    if (relativePath === null || isAnonymousPortalPath(relativePath)) {
        return next(req);
    }

    const session = inject(PortalSessionService);
    const tokens = inject(PortalTokenStore);

    return next(withBearer(req, tokens.accessToken())).pipe(
        catchError((err: unknown) => {
            if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
                return throwError(() => err);
            }

            return session.refreshTokens().pipe(
                catchError((refreshErr: unknown) => {
                    if (refreshErr instanceof PortalSessionExpiredError) {
                        session.expire();

                        return throwError(() => err);
                    }

                    return throwError(() => refreshErr);
                }),
                switchMap((fresh) =>
                    next(withBearer(req, fresh.accessToken)).pipe(
                        catchError((retryErr: unknown) => {
                            if (retryErr instanceof HttpErrorResponse && retryErr.status === 401) {
                                session.expire();
                            }

                            return throwError(() => retryErr);
                        })
                    )
                )
            );
        })
    );
};
