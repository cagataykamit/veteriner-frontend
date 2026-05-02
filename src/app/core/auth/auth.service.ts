import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    AuthOperationResponse,
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

/** Ham API gövdesi — `LoginResultDto` + PascalCase / snake_case varyantları serviste normalize edilir. */
type LoginResultRaw = Record<string, unknown>;

export type ClinicResolutionDecision =
    | { readonly kind: 'none' }
    | { readonly kind: 'single'; readonly clinic: ClinicSummary }
    | { readonly kind: 'multiple' };

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiClient);

    private readonly tokenSignal = signal<string | null>(this.readAccessTokenFromStorage());
    private readonly activeClinicIdSignal = signal<string | null>(localStorage.getItem(ACTIVE_CLINIC_ID_KEY));
    private readonly activeClinicNameSignal = signal<string | null>(localStorage.getItem(ACTIVE_CLINIC_NAME_KEY));
    private readonly authReadySignal = signal(false);

    /**
     * Topbar / layout: klinik adı veya id; ikisi de yoksa null.
     * `computed` ile token / storage güncellemelerinde şablon güncellenir.
     */
    readonly activeClinicLabel = computed(() => {
        const name = this.getClinicName();
        const id = this.getClinicId();
        if (name?.trim()) {
            return name.trim();
        }
        if (id?.trim()) {
            return id.trim();
        }
        return null;
    });

    /** Aynı anda tek refresh HTTP çağrısı (paralel 401’lerde paylaşılır). */
    private refreshShare: Observable<SessionTokens> | null = null;

    readonly authReady = computed(() => this.authReadySignal());

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
        return this.api.post<LoginResultRaw>(ApiEndpoints.auth.login(), body).pipe(
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
        return this.api.get<unknown>(ApiEndpoints.me.clinics()).pipe(map((raw) => this.mapClinicsResponse(raw)));
    }

    /**
     * JWT claim kontrolü (case-insensitive tam eşleşme).
     * Örn: `Vaccinations.Read`
     */
    hasOperationClaim(claim: string): boolean {
        const wanted = claim.trim().toLocaleLowerCase('tr-TR');
        if (!wanted) {
            return false;
        }
        return this.readOperationClaimsFromCurrentToken().some((c) => c === wanted);
    }

    /**
     * Login/select-clinic sonrası tek karar ağacı:
     * - 0 klinik: erişim yok
     * - 1 klinik: otomatik seçim adayı
     * - >1 klinik: kullanıcı seçimi gerekli
     */
    resolveClinicDecision(clinics: ClinicSummary[]): ClinicResolutionDecision {
        if (clinics.length <= 0) {
            return { kind: 'none' };
        }
        if (clinics.length === 1) {
            return { kind: 'single', clinic: clinics[0] };
        }
        return { kind: 'multiple' };
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
        return this.api.post<LoginResultRaw>(ApiEndpoints.auth.selectClinic(), body).pipe(
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
        this.refreshShare = this.api.post<LoginResultRaw>(ApiEndpoints.auth.refresh(), body).pipe(
            map((raw) => this.mapTokenResponse(raw)),
            tap((tokens) => this.persistFromTokens(tokens)),
            catchError((err) => {
                this.refreshShare = null;
                return throwError(() => err);
            }),
            finalize(() => {
                this.refreshShare = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        return this.refreshShare;
    }

    /**
     * Protected route/endpoint öncesi erişim anahtarını doğrular.
     * - Token yoksa `null`
     * - Token geçerliyse mevcut token
     * - Token süresi dolduysa tek-flight refresh ile yeniler
     */
    ensureValidAccessToken(leewaySeconds = 30): Observable<string | null> {
        const current = this.getAccessToken();
        if (!current) {
            this.authReadySignal.set(true);
            return of(null);
        }
        if (!this.isAccessTokenExpired(leewaySeconds)) {
            this.authReadySignal.set(true);
            return of(current);
        }
        if (!this.getRefreshToken()) {
            this.clearSession();
            this.authReadySignal.set(true);
            return of(null);
        }
        return this.refreshSession().pipe(
            map((session) => session.accessToken ?? this.getAccessToken()),
            tap(() => this.authReadySignal.set(true)),
            catchError((err) => {
                this.clearSession();
                this.authReadySignal.set(true);
                return throwError(() => err);
            })
        );
    }

    isAccessTokenExpired(leewaySeconds = 30): boolean {
        const token = this.getAccessToken();
        if (!token) {
            return true;
        }
        const expEpochMs = this.readTokenExpiryEpochMs(token);
        if (!expEpochMs) {
            return false;
        }
        return Date.now() >= expEpochMs - Math.max(0, leewaySeconds) * 1000;
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

    /** Backend logout endpoint'i + typed response normalize + local session clear. */
    logoutCurrentSession(): Observable<AuthOperationResponse> {
        const rt = this.getRefreshToken()?.trim() ?? '';
        if (!rt) {
            this.clearSession();
            return of({ success: true });
        }
        const body: RefreshTokenRequest = { refreshToken: rt };
        return this.api.post<unknown>(ApiEndpoints.auth.logout(), body).pipe(
            map((raw) => this.mapAuthOperationResponse(raw)),
            tap(() => this.clearSession())
        );
    }

    /** Backend logout-all endpoint'i + typed response normalize + local session clear. */
    logoutAllSessions(): Observable<AuthOperationResponse> {
        const rt = this.getRefreshToken()?.trim() ?? '';
        if (!rt) {
            this.clearSession();
            return of({ success: true });
        }
        const body: RefreshTokenRequest = { refreshToken: rt };
        return this.api.post<unknown>(ApiEndpoints.auth.logoutAll(), body).pipe(
            map((raw) => this.mapAuthOperationResponse(raw)),
            tap(() => this.clearSession())
        );
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
     * `LoginResultDto` (ve eski ad varyantları) → `SessionTokens`.
     * Kiracı alanları yalnız bellekte taşınır; localStorage’a yazılmaz.
     */
    private mapTokenResponse(raw: unknown): SessionTokens {
        if (!raw || typeof raw !== 'object') {
            return { accessToken: null, refreshToken: null, expiresAt: null };
        }
        const r = raw as LoginResultRaw;
        const access =
            (r['accessToken'] ?? r['access_token'] ?? r['AccessToken']) as string | null | undefined;
        const refresh =
            (r['refreshToken'] ?? r['refresh_token'] ?? r['RefreshToken']) as string | null | undefined;
        const exp = (r['expiresAt'] ?? r['expires_at'] ?? r['ExpiresAt']) as string | null | undefined;
        const resolvedTenantIdRaw = (r['resolvedTenantId'] ?? r['ResolvedTenantId']) as string | null | undefined;
        const tmc = r['tenantMembershipCount'] ?? r['TenantMembershipCount'];
        let tenantCount: number | null = null;
        if (typeof tmc === 'number' && !Number.isNaN(tmc)) {
            tenantCount = tmc;
        } else if (typeof tmc === 'string') {
            const n = Number.parseInt(tmc, 10);
            if (!Number.isNaN(n)) {
                tenantCount = n;
            }
        }
        return {
            accessToken: typeof access === 'string' && access.trim() ? access.trim() : null,
            refreshToken: typeof refresh === 'string' && refresh.trim() ? refresh.trim() : null,
            expiresAt: typeof exp === 'string' ? exp : null,
            resolvedTenantId:
                typeof resolvedTenantIdRaw === 'string' && resolvedTenantIdRaw.trim()
                    ? resolvedTenantIdRaw.trim()
                    : null,
            tenantMembershipCount: tenantCount
        };
    }

    /** `AuthActionResultDto` — başarı alanı `success` (eski `ok` ile uyum). */
    private mapAuthOperationResponse(raw: unknown): AuthOperationResponse {
        if (!raw || typeof raw !== 'object') {
            return { success: false };
        }
        const r = raw as Record<string, unknown>;
        const successRaw = r['success'] ?? r['Success'] ?? r['ok'] ?? r['Ok'];
        const success = successRaw === true;
        const message =
            typeof (r['message'] ?? r['Message']) === 'string'
                ? String(r['message'] ?? r['Message'])
                : null;
        return { success, message };
    }

    private mapClinicsResponse(raw: unknown): ClinicSummary[] {
        const list = this.extractClinicArray(raw);
        return list
            .map((x) => this.normalizeClinic(x))
            .filter((x): x is ClinicSummary => !!x)
            .filter((c) => c.isActive !== false);
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
        const isActive = this.readClinicIsActiveTri(o);
        const base: ClinicSummary = { id: id.trim(), name: name.trim() };
        if (isActive !== null) {
            base.isActive = isActive;
        }
        return base;
    }

    /** `isActive` / `IsActive` / `active` — yoksa `null` (seçim filtresi uygulanmaz). */
    private readClinicIsActiveTri(o: Record<string, unknown>): boolean | null {
        for (const k of ['isActive', 'IsActive', 'active', 'Active']) {
            const v = o[k];
            if (typeof v === 'boolean') {
                return v;
            }
            if (typeof v === 'string') {
                const t = v.trim().toLowerCase();
                if (t === 'true' || t === '1') {
                    return true;
                }
                if (t === 'false' || t === '0') {
                    return false;
                }
            }
        }
        return null;
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

    /**
     * JWT payload içinden olası claim alanlarını normalize eder.
     * Backend farklı anahtarlar kullanabildiği için birden fazla kaynaktan toplanır.
     */
    private readOperationClaimsFromCurrentToken(): string[] {
        const token = this.getAccessToken();
        if (!token) {
            return [];
        }
        const payload = this.decodeJwtPayload(token);
        if (!payload) {
            return [];
        }
        const keys = [
            'permissions',
            'Permissions',
            'permission',
            'Permission',
            'claims',
            'Claims',
            'roles',
            'Roles',
            'role',
            'Role',
            'scp',
            'scope',
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
        ];
        const out = new Set<string>();
        for (const k of keys) {
            this.collectClaimStrings(payload[k]).forEach((v) => {
                const n = v.trim().toLocaleLowerCase('tr-TR');
                if (n) {
                    out.add(n);
                }
            });
        }
        return Array.from(out);
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

    private readTokenExpiryEpochMs(token: string): number | null {
        const payload = this.decodeJwtPayload(token);
        if (!payload) {
            return null;
        }
        const expRaw = payload['exp'] ?? payload['Exp'];
        if (typeof expRaw === 'number' && Number.isFinite(expRaw)) {
            return expRaw > 1_000_000_000_000 ? expRaw : expRaw * 1000;
        }
        if (typeof expRaw === 'string') {
            const n = Number(expRaw.trim());
            if (Number.isFinite(n)) {
                return n > 1_000_000_000_000 ? n : n * 1000;
            }
        }
        return null;
    }

    private collectClaimStrings(v: unknown): string[] {
        if (typeof v === 'string') {
            const raw = v.trim();
            if (!raw) {
                return [];
            }
            // `scope` / `scp` gibi boşluk ayrımlı claimleri de aç.
            return raw.split(/\s+/).filter((x) => x.trim().length > 0);
        }
        if (Array.isArray(v)) {
            return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        }
        return [];
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
