import { dueChanged } from './vaccination-upsert-date-submit.utils';

describe('dueChanged (aşı düzenlemede vade saati bayrağı)', () => {
    it('vade yoksa false; önceden yokken girildiyse true', () => {
        expect(dueChanged('2026-12-01T07:14:00Z', null)).toBe(false);
        expect(dueChanged(null, '2026-12-01T07:14:00.000Z')).toBe(true);
    });

    it('aynı dakika (biçim farkı dahil) değişmemiş sayılır', () => {
        expect(dueChanged('2026-12-01T07:14:00Z', '2026-12-01T07:14:00.000Z')).toBe(false);
    });

    it('saat ya da gün değişince true', () => {
        expect(dueChanged('2026-12-01T07:14:00Z', '2026-12-01T08:14:00.000Z')).toBe(true);
        expect(dueChanged('2026-12-01T07:14:00Z', '2026-12-02T07:14:00.000Z')).toBe(true);
    });
});
