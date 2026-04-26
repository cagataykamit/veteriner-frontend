/**
 * GET /api/v1/dashboard/capabilities
 */
export interface DashboardCapabilitiesDto {
    canViewFinance?: boolean | null;
    canViewOperationalAlerts?: boolean | null;
    isOwner?: boolean | null;
    isAdmin?: boolean | null;
    isStaff?: boolean | null;
    selectedClinicId?: string | null;
    hasClinicContext?: boolean | null;
    isTenantReadOnly?: boolean | null;
}

export interface DashboardCapabilitiesVm {
    canViewFinance: boolean;
    canViewOperationalAlerts: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    selectedClinicId: string | null;
    hasClinicContext: boolean;
    isTenantReadOnly: boolean;
}
