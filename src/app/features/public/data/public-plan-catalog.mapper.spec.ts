import { mapPublicPlanCatalogDto } from '@/app/features/public/data/public-plan-catalog.mapper';

describe('public-plan-catalog.mapper (WEB-007)', () => {
    it('kuruşu TL yapar; KDV bayrağı, yıllık kural ve kullanıcı sınırı yanıttan', () => {
        expect(
            mapPublicPlanCatalogDto({
                currency: 'try',
                vatIncluded: false,
                yearlyBilledMonths: 10,
                plans: [
                    { planCode: ' Basic ', name: 'Basic', maxUsers: 3, monthlyPriceMinor: 149000, yearlyPriceMinor: 1490000 },
                    { planCode: 'Premium', name: 'Premium', maxUsers: 50, monthlyPriceMinor: null, yearlyPriceMinor: null }
                ]
            })
        ).toEqual({
            vatIncluded: false,
            yearlyBilledMonths: 10,
            plans: [
                { apiCode: 'Basic', maxUsers: 3, monthlyPriceTry: 1490, yearlyPriceTry: 14900 },
                { apiCode: 'Premium', maxUsers: 50, monthlyPriceTry: null, yearlyPriceTry: null }
            ]
        });
    });

    it('kodsuz paket atlanır; eksik sınır null olur', () => {
        const catalog = mapPublicPlanCatalogDto({ currency: 'TRY', yearlyBilledMonths: 10, plans: [{ planCode: '', maxUsers: 3 }, { planCode: 'Pro' }] });

        expect(catalog?.plans).toEqual([{ apiCode: 'Pro', maxUsers: null, monthlyPriceTry: null, yearlyPriceTry: null }]);
        expect(catalog?.vatIncluded).toBe(false);
    });

    it('TRY dışı para birimi, eksik ya da geçersiz yıllık kural ve boş yanıt kullanılmaz', () => {
        expect(mapPublicPlanCatalogDto({ currency: 'EUR', yearlyBilledMonths: 10, plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto({ currency: 'TRY', plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto({ currency: 'TRY', yearlyBilledMonths: 13, plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto(null)).toBeNull();
    });
});
