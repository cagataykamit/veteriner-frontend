export interface TenantMemberListItemVm {
    id: string;
    email: string;
    emailConfirmed: boolean | null;
    createdAtUtc: string | null;
}
