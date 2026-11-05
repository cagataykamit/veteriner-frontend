import { priceMinorToTry, type PricingCatalog, type PricingPlanOffer } from '@/app/entities/subscription/utils/pricing-plan.utils';
import type { PublicSubscriptionPlanCatalogDto } from '@/app/features/public/models/public-plan-catalog-api.model';

const whole = (value: number | null | undefined): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);

/**
 * Paket kataloğu yanıtı → görünüm. Para birimi TRY değilse ya da yıllık kural yoksa katalog kullanılamaz (`null`; sayfa
 * tutar yazmaz). Kod ya da kullanıcı sınırı eksik paket atlanır.
 */
export function mapPublicPlanCatalogDto(dto: PublicSubscriptionPlanCatalogDto | null | undefined): PricingCatalog | null {
    const yearlyBilledMonths = whole(dto?.yearlyBilledMonths);

    if (!dto || dto.currency?.trim().toUpperCase() !== 'TRY' || yearlyBilledMonths == null || yearlyBilledMonths > 12) {
        return null;
    }

    const plans = (dto.plans ?? [])
        .map((p): PricingPlanOffer | null => {
            const apiCode = p.planCode?.trim();

            return apiCode
                ? { apiCode, maxUsers: whole(p.maxUsers), monthlyPriceTry: priceMinorToTry(p.monthlyPriceMinor), yearlyPriceTry: priceMinorToTry(p.yearlyPriceMinor) }
                : null;
        })
        .filter((p): p is PricingPlanOffer => p !== null);

    return { vatIncluded: dto.vatIncluded === true, yearlyBilledMonths, plans };
}
