import { apiKeyScopeLabel, maskedApiKey } from './api-key-labels.utils';

describe('api-key-labels.utils', () => {
    it('kapsamlar Türkçe adla, bilinmeyen kapsam kendi koduyla görünür', () => {
        expect(apiKeyScopeLabel('clients:read')).toBe('Müşteriler');
        expect(apiKeyScopeLabel('vaccinations:read')).toBe('Aşılar');
        expect(apiKeyScopeLabel('invoices:read')).toBe('invoices:read');
    });

    it('maskeli gösterim yalnız ön eki taşır', () => {
        expect(maskedApiKey('vtk_abcdefgh')).toBe('vtk_abcdefgh_••••••••');
    });
});
