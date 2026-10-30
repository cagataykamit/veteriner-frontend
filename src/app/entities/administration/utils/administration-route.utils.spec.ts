import { ADMINISTRATION_ROUTE_OPTIONS, administrationRouteFromApi, administrationRouteSiteText } from './administration-route.utils';

describe('administration-route.utils', () => {
    it('bilinen yolu tanır, bilinmeyeni null yapar', () => {
        expect(administrationRouteFromApi('Intramuscular')).toBe('Intramuscular');
        expect(administrationRouteFromApi('Telepati')).toBeNull();
        expect(administrationRouteFromApi(null)).toBeNull();
    });

    it('yol ve bölgeyi tek satırda birleştirir; ikisi de boşsa null', () => {
        expect(administrationRouteSiteText({ route: 'Subcutaneous', site: ' Boyun arkası ' })).toBe('Deri altı (SC) · Boyun arkası');
        expect(administrationRouteSiteText({ route: null, site: 'Sol kulak' })).toBe('Sol kulak');
        expect(administrationRouteSiteText({ route: null, site: '  ' })).toBeNull();
    });

    it('seçim listesi sunucudaki tüm yolları içerir', () => {
        expect(ADMINISTRATION_ROUTE_OPTIONS.map((o) => o.value).sort()).toEqual(
            ['Intradermal', 'Intramuscular', 'Intranasal', 'Intravenous', 'Ophthalmic', 'Oral', 'Other', 'Otic', 'Rectal', 'Subcutaneous', 'Topical'].sort()
        );
    });
});
