/** Pakete bağlı özellik (`PLAN_FEATURES_API_CONTRACT.md` §1). Kural backend'dedir; panel yalnız sonucu okur. */
export type PlanFeatureCode = 'OwnerPortal' | 'PortalAppointmentRequests' | 'MultiClinic' | 'AutomatedReminders' | 'AdvancedReports';

export interface TenantPlanFeatureVm {
    readonly feature: string;
    readonly isEnabled: boolean;
    /** Özelliği içeren en küçük paketin API kodu. */
    readonly requiredPlanCode: string;
}

/** GET `/api/v1/tenants/{tenantId}/access-state` — panel salt okunur bağlamı ve paket özellikleri. */
export interface TenantAccessStateVm {
    readonly tenantId: string;
    readonly isReadOnly: boolean;
    readonly reasonCode: string | null;
    readonly message: string | null;
    readonly planCode: string | null;
    readonly planFeatures: readonly TenantPlanFeatureVm[];
}
