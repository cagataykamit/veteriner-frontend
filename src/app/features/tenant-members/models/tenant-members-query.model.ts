/**
 * GET `/api/v1/tenants/{tenantId}/members` — HttpParams: `Page`, `PageSize`, `Search`.
 */
export interface TenantMembersListQuery {
    page?: number;
    pageSize?: number;
    /** Boşsa gönderilmez. */
    search?: string;
}
