export interface TenantMemberListItemVm {
    id: string;
    /** Ad soyad; backend göndermezse `null` — birincil etiket için e-posta kullanılır. */
    name: string | null;
    email: string;
    emailConfirmed: boolean | null;
    createdAtUtc: string | null;
}

export interface TenantMemberClaimVm {
    id: string;
    name: string;
    /** Backend `false` gönderirse kaldır gizlenir; yoksa true kabul edilir. */
    canRemove: boolean;
}

export interface TenantMemberClinicVm {
    /** Klinik kimliği; yalnızca isteklerde kullanılır, etiket olarak gösterilmez. */
    id: string;
    name: string;
    isActive: boolean | null;
    /** Backend `false` gönderirse kaldır gizlenir; yoksa true kabul edilir. */
    canRemove: boolean;
}

export interface TenantMemberDetailVm {
    id: string;
    /** Ad soyad; backend göndermezse `null`. */
    name: string | null;
    email: string;
    emailConfirmed: boolean | null;
    tenantMembershipCreatedAtUtc: string | null;
    /** Oturumdaki kullanıcı bu üye kaydıysa self-aksiyonlar kapatılır. */
    isCurrentUser: boolean;
    claims: TenantMemberClaimVm[];
    clinics: TenantMemberClinicVm[];
    /** Yanıtta ilgili koleksiyon anahtarı hiç yoksa bölüm render edilmez. */
    claimsSectionPresent: boolean;
    clinicsSectionPresent: boolean;
}

/** GET assignable-role-permission-matrix — salt okunur rol satırı. */
export interface TenantRoleMatrixPermissionVm {
    id: string;
    /** Backend permission kodu (örn. `Clinics.Update`); Türkçe etiket üretimi için. */
    code: string | null;
    /** Chip / kısa etiket (operationClaimName veya code öncelikli). */
    name: string;
    /** Backend `group`; gruplama için. */
    group: string | null;
    /** Uzun açıklama; chip `title` ile gösterilir, chip metni olarak kullanılmaz. */
    description: string | null;
}

export interface TenantRolePermissionMatrixRowVm {
    roleId: string;
    roleName: string;
    permissions: TenantRoleMatrixPermissionVm[];
}
