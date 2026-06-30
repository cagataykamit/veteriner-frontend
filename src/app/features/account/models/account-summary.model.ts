export interface AccountSummary {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    tenantId?: string | null;
    tenantName?: string | null;
    activeClinicId?: string | null;
    activeClinicName?: string | null;
    roles: string[];
    isTenantWide: boolean;
}
