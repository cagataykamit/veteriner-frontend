import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';

const ACCESS_TOKEN_KEY = 'veteriner.access_token';
const REFRESH_TOKEN_KEY = 'veteriner.refresh_token';

/** Swagger: `LoginCommand` */
export interface LoginRequest {
    email: string;
    password: string;
    tenantId?: string | null;
}

/** Swagger: `LoginResultDto` */
export interface LoginResponse {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiClient);

    private readonly tokenSignal = signal<string | null>(this.readAccessTokenFromStorage());

    getAccessToken(): string | null {
        return this.tokenSignal();
    }

    isLoggedIn(): boolean {
        return !!this.tokenSignal();
    }

    login(body: LoginRequest): Observable<LoginResponse> {
        return this.api.post<LoginResponse>(ApiEndpoints.auth.login(), body).pipe(
            tap((res) => this.persistSession(res)),
            catchError((err) => throwError(() => err))
        );
    }

    logout(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        this.tokenSignal.set(null);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    private persistSession(res: LoginResponse): void {
        if (res.accessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
            this.tokenSignal.set(res.accessToken);
        }
        if (res.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
        }
    }

    private readAccessTokenFromStorage(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

}
