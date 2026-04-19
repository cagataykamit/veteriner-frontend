/**
 * Backend auth sözleşmesi — alan adları burada toplanır.
 * Ham JSON farklıysa eşleme yalnızca AuthService içinde yapılır.
 */

/** Swagger: LoginCommand — tek kiracı modeli; `tenantId` yalnız backend uyumluluğu için opsiyonel kalabilir. */
export interface LoginRequest {
    email: string;
    password: string;
    tenantId?: string | null;
}

/**
 * İstemci gövdesi: yalnızca refreshToken (backend kontratı).
 * Aynı şekil `POST /Auth/logout` ve `POST /Auth/logout-all` isteklerinde kullanılır.
 */
export interface RefreshTokenRequest {
    refreshToken: string;
}

/**
 * Backend başarı gövdesi: `LoginResultDto` (login / refresh / select-clinic).
 * İstemci depolama ve sinyaller için `SessionTokens`’a indirgenir.
 */
export interface LoginResultDto {
    accessToken: string;
    refreshToken: string;
    expiresAt?: string | null;
    resolvedTenantId?: string | null;
    tenantMembershipCount?: number | null;
}

/** Normalize edilmiş oturum (storage + bileşenler). */
export interface SessionTokens {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt?: string | null;
    /** JWT / backend yanıtından — isteğe bağlı, localStorage’a yazılmaz. */
    resolvedTenantId?: string | null;
    tenantMembershipCount?: number | null;
}

export interface ClinicSummary {
    id: string;
    name: string;
    /** `/me/clinics` yanıtında varsa; pasifler seçim listelerinde gösterilmez. */
    isActive?: boolean | null;
}

export interface SelectClinicRequest {
    refreshToken: string;
    clinicId: string;
}

/** Logout / logout-all başarı gövdesi: `AuthActionResultDto`. */
export interface AuthOperationResponse {
    success: boolean;
    message?: string | null;
}
