/** `GET /api/v1/public/subscription-plans` (WEB-007, backend `docs/SUBSCRIPTION_PLAN_CATALOG_API_CONTRACT.md` §2). */
export interface PublicSubscriptionPlanDto {
    planCode?: string | null;
    name?: string | null;
    maxUsers?: number | null;
    /** Kuruş, KDV hariç; fiyat yapılandırılmamışsa `null`. */
    monthlyPriceMinor?: number | null;
    yearlyPriceMinor?: number | null;
}

export interface PublicSubscriptionPlanCatalogDto {
    currency?: string | null;
    vatIncluded?: boolean | null;
    yearlyBilledMonths?: number | null;
    plans?: PublicSubscriptionPlanDto[] | null;
}
