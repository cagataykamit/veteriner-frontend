/** GET `/api/v1/tenants/{tenantId}/access-state` — panel salt okunur bağlamı. */
export interface TenantAccessStateVm {
    readonly tenantId: string;
    readonly isReadOnly: boolean;
    readonly reasonCode: string | null;
    readonly message: string | null;
}
