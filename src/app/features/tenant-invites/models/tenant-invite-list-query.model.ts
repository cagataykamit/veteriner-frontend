/**
 * GET `/api/v1/tenants/{tenantId}/invites` — HttpParams: `Page`, `PageSize`, `Search`.
 */
export interface TenantInvitesListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
}
