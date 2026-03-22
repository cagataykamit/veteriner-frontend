import { inject, Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, share, tap } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { LoginRequest, RefreshTokenRequest, SessionTokens } from '@/app/core/auth/auth.models';

const ACCESS_TOKEN_KEY = 'veteriner.access_token';
const REFRESH_TOKEN_KEY = 'veteriner.refresh_token';

/** Ham API gövdesi — PascalCase / snake_case varyantları serviste normalize edilir. */
type TokenResponseRaw = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiClient);

    private readonly tokenSignal = signal<string | null>(this.readAccessTokenFromStorage());

    /** Aynı anda tek refresh HTTP çağrısı (paralel 401’lerde paylaşılır). */
    private refreshShare: Observable<SessionTokens> | null = null;

    getAccessToken(): string | null {
        return this.tokenSignal();
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    /** Oturum açık mı (access token var mı). */
    isAuthenticated(): boolean {
        return !!this.tokenSignal();
    }

    /** @deprecated `isAuthenticated()` ile aynı — geriye dönük uyumluluk. */
    isLoggedIn(): boolean {
        return this.isAuthenticated();
    }

    login(body: LoginRequest): Observable<SessionTokens> {
        return this.api.post<TokenResponseRaw>(ApiEndpoints.auth.login(), body).pipe(
            map((raw) => this.mapTokenResponse(raw)),
            tap((tokens) => this.persistFromTokens(tokens)),
            catchError((err) => throwError(() => err))
        );
    }

    /**
     * Refresh token ile yeni access (ve varsa yeni refresh) alır.
     * Paralel çağrılar tek HTTP isteğinde birleşir.
     */
    refreshSession(): Observable<SessionTokens> {
        if (this.refreshShare) {
            return this.refreshShare;
        }
        const rt = this.getRefreshToken();
        if (!rt) {
            return throwError(() => new Error('Yenileme anahtarı yok.'));
        }
        const body: RefreshTokenRequest = { refreshToken: rt };
        this.refreshShare = this.api.post<TokenResponseRaw>(ApiEndpoints.auth.refresh(), body).pipe(
            map((raw) => this.mapTokenResponse(raw)),
            tap((tokens) => this.persistFromTokens(tokens)),
            catchError((err) => {
                this.refreshShare = null;
                return throwError(() => err);
            }),
            finalize(() => {
                this.refreshShare = null;
            }),
            share()
        );
        return this.refreshShare;
    }

    /**
     * Normalize tokenlarla oturumu yazar (test veya harici akış için).
     */
    setSession(tokens: SessionTokens): void {
        this.persistFromTokens(tokens);
    }

    /** Storage + signal temizliği; HTTP logout çağrısı bu fazda zorunlu değil. */
    clearSession(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        this.tokenSignal.set(null);
    }

    /** `clearSession` ile aynı — kullanıcı çıkışı. */
    logout(): void {
        this.clearSession();
    }

    private persistFromTokens(tokens: SessionTokens): void {
        if (tokens.accessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
            this.tokenSignal.set(tokens.accessToken);
        }
        if (tokens.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
        }
    }

    private readAccessTokenFromStorage(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    /**
     * Backend JSON şeklini izole eder — bileşenler ham yanıt görmez.
     */
    private mapTokenResponse(raw: unknown): SessionTokens {
        if (!raw || typeof raw !== 'object') {
            return { accessToken: null, refreshToken: null, expiresAt: null };
        }
        const r = raw as TokenResponseRaw;
        const access =
            (r['accessToken'] ?? r['access_token'] ?? r['AccessToken']) as string | null | undefined;
        const refresh =
            (r['refreshToken'] ?? r['refresh_token'] ?? r['RefreshToken']) as string | null | undefined;
        const exp = (r['expiresAt'] ?? r['expires_at'] ?? r['ExpiresAt']) as string | null | undefined;
        return {
            accessToken: typeof access === 'string' && access.trim() ? access.trim() : null,
            refreshToken: typeof refresh === 'string' && refresh.trim() ? refresh.trim() : null,
            expiresAt: typeof exp === 'string' ? exp : null
        };
    }
}
