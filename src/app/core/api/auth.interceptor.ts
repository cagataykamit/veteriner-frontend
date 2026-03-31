import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

const AUTH_RETRY_HEADER = 'X-Auth-Retry';

function isAuthLoginUrl(url: string): boolean {
    return url.includes('/Auth/login');
}

function isAuthRefreshUrl(url: string): boolean {
    return url.includes('/Auth/refresh');
}

function isPublicAuthUrl(url: string): boolean {
    return isAuthLoginUrl(url) || isAuthRefreshUrl(url);
}

/**
 * - Login / refresh isteklerine Bearer eklemez (gövde kontratı).
 * - Diğer isteklere Bearer ekler.
 * - 401: refresh token varsa bir kez yeniler ve orijinal isteği tekrarlar (`X-Auth-Retry`).
 * - Refresh veya ikinci 401 sonrası uygun şekilde session temizliği / yönlendirme.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const url = req.url;
    const isPublic = isPublicAuthUrl(url);
    const token = auth.getAccessToken();

    let outgoing = req;
    if (!isPublic && token) {
        outgoing = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(outgoing).pipe(
        catchError((err: HttpErrorResponse) => {
            // Yenileme uçları: geçersiz/süresi dolmuş token için 401 yanı sıra 400 veya 403 da sık görülür.
            // 429 ağır deneme sınırı olabilir — oturumu silmeyelim; kullanıcı tekrar denebilir.
            if (isAuthRefreshUrl(url)) {
                if (err.status === 401 || err.status === 400 || err.status === 403) {
                    auth.clearSession();
                    router.navigate(['/auth/login'], {
                        queryParams: { returnUrl: router.url, reauth: '1' }
                    });
                }
                return throwError(() => err);
            }

            if (err.status !== 401) {
                return throwError(() => err);
            }

            if (isAuthLoginUrl(url)) {
                return throwError(() => err);
            }

            if (req.headers.has(AUTH_RETRY_HEADER)) {
                auth.clearSession();
                router.navigate(['/auth/login'], {
                    queryParams: { returnUrl: router.url, reauth: '1' }
                });
                return throwError(() => err);
            }

            if (!auth.getRefreshToken()) {
                auth.clearSession();
                router.navigate(['/auth/login'], {
                    queryParams: { returnUrl: router.url, reauth: '1' }
                });
                return throwError(() => err);
            }

            return auth.refreshSession().pipe(
                switchMap((session) => {
                    const newAccess = session.accessToken ?? auth.getAccessToken();
                    if (!newAccess) {
                        auth.clearSession();
                        router.navigate(['/auth/login'], {
                            queryParams: { returnUrl: router.url, reauth: '1' }
                        });
                        return throwError(() => err);
                    }
                    const retry = req.clone({
                        setHeaders: {
                            Authorization: `Bearer ${newAccess}`,
                            [AUTH_RETRY_HEADER]: '1'
                        }
                    });
                    return next(retry);
                }),
                catchError(() => {
                    auth.clearSession();
                    router.navigate(['/auth/login'], {
                        queryParams: { returnUrl: router.url, reauth: '1' }
                    });
                    return throwError(() => err);
                })
            );
        })
    );
};
