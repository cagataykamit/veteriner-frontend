/** Kiracı üyesi liste satırı — backend şemasıyla hizalı; ek anahtarlar mapper’da okunur. */
export interface TenantMemberListItemDto {
    id: string;
    name?: string | null;
    email?: string | null;
    emailConfirmed?: boolean | null;
    /** Alternatif anahtarlar için mapper fallback. */
    isEmailConfirmed?: boolean | null;
    createdAtUtc?: string | null;
}

export interface TenantMemberListItemDtoPagedResult {
    items?: TenantMemberListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * GET tek üye — şema backend ile hizalanır; ek koleksiyonlar mapper’da okunur.
 * Bu arayüz yalnızca tip rehberi; gerçek yanıt `unknown` üzerinden map edilir.
 *
 * Örnek: `roles[]` (`operationClaimId`, `operationClaimName`), `clinics[]` (`clinicId`, `name`, `isActive`).
 */
export interface TenantMemberDetailDto {
    /** Oturumdaki kullanıcı bu üye ise self-aksiyonlar UI’da kapatılır. */
    isCurrentUser?: boolean | null;
    id?: string | null;
    userId?: string | null;
    name?: string | null;
    email?: string | null;
    emailConfirmed?: boolean | null;
    tenantMembershipCreatedAtUtc?: string | null;
    createdAtUtc?: string | null;
    roles?: unknown[] | null;
    clinics?: unknown[] | null;
}

/** Rol atama: `POST .../members/{memberId}/roles/{operationClaimId}` — gövde `{}` (kimlik URL’de). */

/** Klinik üyeliği: `POST|DELETE .../members/{memberId}/clinics/{clinicId}` — POST gövdesi `{}`. */

/** Üye atama dropdown: `GET /api/v1/clinics` (kiracı JWT bağlamı); `/me/clinics` kişisel üyeliklerdir. Mapper: `mapTenantClinicsListRaw`. */
