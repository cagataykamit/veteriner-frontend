import { inject, Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, share, tap } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ClinicSummary,
    LoginRequest,
    RefreshTokenRequest,
    SelectClinicRequest,
    SessionTokens
} from '@/app/core/auth/auth.models';

const ACCESS_TOKEN_KEY = 'veteriner.access_token';
const REFRESH_TOKEN_KEY = 'veteriner.refresh_token';
const ACTIVE_CLINIC_ID_KEY = 'veteriner.active_clinic_id';
const ACTIVE_CLINIC_NAME_KEY = 'veteriner.active_clinic_name';

/** Ham API gövdesi — PascalCase / snake_case varyantları serviste normalize edilir. */
type TokenResponseRaw = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiClient);

    private readonly tokenSignal = signal<string | null>(this.readAccessTokenFromStorage());
    private readonly activeClinicIdSignal = signal<string | null>(localStorage.getItem(ACTIVE_CLINIC_ID_KEY));
    private readonly activeClinicNameSignal = signal<string | null>(localStorage.getItem(ACTIVE_CLINIC_NAME_KEY));

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

    hasSelectedClinic(): boolean {
        return !!this.getClinicId();
    }

    getClinicId(): string | null {
        const fromToken = this.readClinicClaimsFromCurrentToken().id;
        if (fromToken) {
            return fromToken;
        }
        const stored = this.activeClinicIdSignal();
        return stored?.trim() ? stored.trim() : null;
    }

    getClinicName(): string | null {
        const fromToken = this.readClinicClaimsFromCurrentToken().name;
        if (fromToken) {
            return fromToken;
        }
        const stored = this.activeClinicNameSignal();
        return stored?.trim() ? stored.trim() : null;
    }

    /** @deprecated `isAuthenticated()` ile aynı — geriye dönük uyumluluk. */
    isLoggedIn(): boolean {
        return this.isAuthenticated();
    }

    login(body: LoginRequest): Observable<SessionTokens> {
        return this.api.post<TokenResponseRaw>(ApiEndpoints.auth.login(), body).pipe(
            map((raw) => this.mapTokenResponse(raw)),
            tap((tokens) => {
                // Yeni oturumda eski clinic bağlamını taşımayalım.
                this.resetClinicContext();
                this.persistFromTokens(tokens);
            }),
            catchError((err) => throwError(() => err))
        );
    }

    getMyClinics(): Observable<ClinicSummary[]> {
        return this.api.get<unknown>(ApiEndpoints.me.clinics()).pipe(
            catchError((err) => {
                // Bazı backend sürümlerinde endpoint /me/clinics (api/v1 prefix olmadan) publish edilebilir.
                if (err?.status === 404) {
                    return this.api.get<unknown>('/me/clinics');
                }
                return throwError(() => err);
            }),
            map((raw) => this.mapClinicsResponse(raw))
        );
    }

    selectClinic(clinicId: string, clinicName?: string | null): Observable<SessionTokens> {
        const refreshToken = this.getRefreshToken()?.trim() ?? '';
        if (!refreshToken) {
            return throwError(() => new Error('Klinik seçimi için yenileme anahtarı bulunamadı. Lütfen tekrar giriş yapın.'));
        }
        const body: SelectClinicRequest = {
            refreshToken,
            clinicId: clinicId.trim()
        };
        return this.api.post<TokenResponseRaw>(ApiEndpoints.auth.selectClinic(), body).pipe(
            map((raw) => this.mapTokenResponse(raw)),
            tap((tokens) => {
                this.persistFromTokens(tokens);
                this.setActiveClinicContext(clinicId, clinicName ?? null);
            })
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
        this.resetClinicContext();
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
        this.syncClinicFromTokenClaims();
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

    private mapClinicsResponse(raw: unknown): ClinicSummary[] {
        const list = this.extractClinicArray(raw);
        return list
            .map((x) => this.normalizeClinic(x))
            .filter((x): x is ClinicSummary => !!x);
    }

    private extractClinicArray(raw: unknown): unknown[] {
        if (Array.isArray(raw)) {
            return raw;
        }
        if (!raw || typeof raw !== 'object') {
            return [];
        }
        const o = raw as Record<string, unknown>;
        const candidates = [
            o['items'],
            o['Items'],
            o['data'],
            o['Data'],
            o['value'],
            o['Value'],
            o['result'],
            o['Result'],
            o['clinics'],
            o['Clinics']
        ];
        for (const c of candidates) {
            if (Array.isArray(c)) {
                return c;
            }
        }
        return [];
    }

    private normalizeClinic(raw: unknown): ClinicSummary | null {
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        const o = raw as Record<string, unknown>;
        const id = this.firstString(o['id'], o['Id'], o['clinicId'], o['ClinicId']);
        const name = this.firstString(o['name'], o['Name'], o['clinicName'], o['ClinicName'], o['title'], o['Title']);
        if (!id || !name) {
            return null;
        }
        return { id: id.trim(), name: name.trim() };
    }

    private syncClinicFromTokenClaims(): void {
        const claims = this.readClinicClaimsFromCurrentToken();
        if (claims.id) {
            localStorage.setItem(ACTIVE_CLINIC_ID_KEY, claims.id);
            this.activeClinicIdSignal.set(claims.id);
        }
        if (claims.name) {
            localStorage.setItem(ACTIVE_CLINIC_NAME_KEY, claims.name);
            this.activeClinicNameSignal.set(claims.name);
        }
    }

    private setActiveClinicContext(id: string, name: string | null): void {
        const trimmedId = id.trim();
        if (trimmedId) {
            localStorage.setItem(ACTIVE_CLINIC_ID_KEY, trimmedId);
            this.activeClinicIdSignal.set(trimmedId);
        }
        const trimmedName = name?.trim() ?? '';
        if (trimmedName) {
            localStorage.setItem(ACTIVE_CLINIC_NAME_KEY, trimmedName);
            this.activeClinicNameSignal.set(trimmedName);
        }
    }

    private resetClinicContext(): void {
        localStorage.removeItem(ACTIVE_CLINIC_ID_KEY);
        localStorage.removeItem(ACTIVE_CLINIC_NAME_KEY);
        this.activeClinicIdSignal.set(null);
        this.activeClinicNameSignal.set(null);
    }

    private readClinicClaimsFromCurrentToken(): { id: string | null; name: string | null } {
        const token = this.getAccessToken();
        if (!token) {
            return { id: null, name: null };
        }
        const payload = this.decodeJwtPayload(token);
        if (!payload) {
            return { id: null, name: null };
        }
        const id = this.firstString(
            payload['clinic_id'],
            payload['clinicId'],
            payload['ClinicId'],
            payload['clinic']
        );
        const name = this.firstString(
            payload['clinic_name'],
            payload['clinicName'],
            payload['ClinicName'],
            payload['clinicDisplayName']
        );
        return {
            id: id?.trim() || null,
            name: name?.trim() || null
        };
    }

    private decodeJwtPayload(token: string): Record<string, unknown> | null {
        try {
            const parts = token.split('.');
            if (parts.length < 2) {
                return null;
            }
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
            const json = atob(padded);
            const parsed = JSON.parse(json) as unknown;
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    private firstString(...vals: unknown[]): string | null {
        for (const v of vals) {
            if (typeof v === 'string' && v.trim()) {
                return v;
            }
        }
        return null;
    }
}
