import { joinPresent } from './labels.utils';

/** G-05: boş parça ayırıcısıyla birlikte atlanır; "—" boş sayılır. */
describe('joinPresent', () => {
    it('boş ve "—" parçaları ayırıcısıyla birlikte atlar', () => {
        expect(joinPresent(['Burcu Çelik', '—'], ' — ')).toBe('Burcu Çelik');
        expect(joinPresent(['—', 'Hastalar: Limon'], ' · ')).toBe('Hastalar: Limon');
        expect(joinPresent([null, undefined, '  '], ' · ')).toBe('');
        expect(joinPresent(['Ali', '+90 532 000 00 00'], ' — ')).toBe('Ali — +90 532 000 00 00');
    });
});
