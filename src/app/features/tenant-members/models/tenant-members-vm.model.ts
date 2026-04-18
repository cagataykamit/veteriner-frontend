export interface TenantMemberListItemVm {
    id: string;
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
    email: string;
    emailConfirmed: boolean | null;
    tenantMembershipCreatedAtUtc: string | null;
    claims: TenantMemberClaimVm[];
    clinics: TenantMemberClinicVm[];
    /** Yanıtta ilgili koleksiyon anahtarı hiç yoksa bölüm render edilmez. */
    claimsSectionPresent: boolean;
    clinicsSectionPresent: boolean;
}
