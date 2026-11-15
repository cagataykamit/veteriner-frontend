import { vaccineReason } from './portal-booking.rules';

const reason = (id: string | null, name: string) => ({ id, name, durationMinutes: 15, requiresNote: false });

describe('vaccineReason (H7)', () => {
    it('adında "aşı" ile başlayan sözcük geçen ilk nedeni bulur', () => {
        expect(vaccineReason([reason('r1', 'Kontrol'), reason('r2', 'Kuduz aşısı'), reason('r3', 'Aşı')])?.id).toBe('r2');
        expect(vaccineReason([reason('r1', 'AŞILAMA')])?.id).toBe('r1');
    });

    it('benzer sözcük ("Kaşıntı") ve kimliksiz "Diğer" seçilmez', () => {
        expect(vaccineReason([reason('r1', 'Kaşıntı'), reason(null, 'Aşı / diğer')])).toBeNull();
    });
});
