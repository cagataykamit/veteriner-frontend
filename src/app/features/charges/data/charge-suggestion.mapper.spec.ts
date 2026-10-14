import { chargeSuggestionsQueryToHttpParams } from './charge-suggestion.mapper';

describe('chargeSuggestionsQueryToHttpParams', () => {
    it('müşteri süzgeci (clientId) klinik kapsamıyla birlikte gider; boş süzgeçler gönderilmez', () => {
        const p = chargeSuggestionsQueryToHttpParams({ clinicId: 'k1', clientId: ' c1 ', pageSize: 200 });
        expect(p.get('clinicId')).toBe('k1');
        expect(p.get('clientId')).toBe('c1');
        expect(p.get('pageSize')).toBe('200');
        expect(p.has('petId')).toBeFalse();
    });
});
