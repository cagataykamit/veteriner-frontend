/**
 * Backend auth sözleşmesi — alan adları burada toplanır.
 * Ham JSON farklıysa eşleme yalnızca AuthService içinde yapılır.
 */

/** Swagger: LoginCommand */
export interface LoginRequest {
    email: string;
    password: string;
    /** Çok kiracılı API: isteğe bağlı; UI’da zorunlu alan yok — `environment.authTenantId` veya ileride ayar ekranından beslenebilir. */
    tenantId?: string | null;
}

/** İstemci gövdesi: yalnızca refreshToken (backend kontratı). */
export interface RefreshTokenRequest {
    refreshToken: string;
}

/** Normalize edilmiş oturum jetonları (storage + signal). */
export interface SessionTokens {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt?: string | null;
}

export interface ClinicSummary {
    id: string;
    name: string;
}

export interface SelectClinicRequest {
    refreshToken: string;
    clinicId: string;
}

/** Auth mutate endpointleri (logout/logout-all) için typed başarı yanıtı. */
export interface AuthOperationResponse {
    ok: boolean;
    message?: string | null;
    code?: string | null;
    timestampUtc?: string | null;
}
