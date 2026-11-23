import { mapPublicPlanCatalogDto } from '@/app/features/public/data/public-plan-catalog.mapper';

describe('public-plan-catalog.mapper (WEB-007)', () => {
    it('kuruşu TL yapar; KDV bayrağı, yıllık kural, kullanıcı sınırı ve aylık yapay zekâ kredisi yanıttan', () => {
        expect(
            mapPublicPlanCatalogDto({
                currency: 'try',
                vatIncluded: false,
                yearlyBilledMonths: 10,
                plans: [
                    { planCode: ' Basic ', name: 'Basic', maxUsers: 3, monthlyPriceMinor: 89000, yearlyPriceMinor: 890000, monthlyAiCredits: 0 },
                    { planCode: 'Premium', name: 'Premium', maxUsers: 15, monthlyPriceMinor: null, yearlyPriceMinor: null, monthlyAiCredits: 2000 }
                ]
            })
        ).toEqual({
            vatIncluded: false,
            yearlyBilledMonths: 10,
            plans: [
                { apiCode: 'Basic', maxUsers: 3, monthlyPriceTry: 890, yearlyPriceTry: 8900, monthlyAiCredits: 0 },
                { apiCode: 'Premium', maxUsers: 15, monthlyPriceTry: null, yearlyPriceTry: null, monthlyAiCredits: 2000 }
            ]
        });
    });

    it('kodsuz paket atlanır; eksik sınır null olur', () => {
        const catalog = mapPublicPlanCatalogDto({ currency: 'TRY', yearlyBilledMonths: 10, plans: [{ planCode: '', maxUsers: 3 }, { planCode: 'Pro' }] });

        expect(catalog?.plans).toEqual([{ apiCode: 'Pro', maxUsers: null, monthlyPriceTry: null, yearlyPriceTry: null, monthlyAiCredits: null }]);
        expect(catalog?.vatIncluded).toBe(false);
    });

    it('TRY dışı para birimi, eksik ya da geçersiz yıllık kural ve boş yanıt kullanılmaz', () => {
        expect(mapPublicPlanCatalogDto({ currency: 'EUR', yearlyBilledMonths: 10, plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto({ currency: 'TRY', plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto({ currency: 'TRY', yearlyBilledMonths: 13, plans: [] })).toBeNull();
        expect(mapPublicPlanCatalogDto(null)).toBeNull();
    });
});
