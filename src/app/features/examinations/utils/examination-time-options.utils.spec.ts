import { defaultExaminationDateTimeParts, examinationTimeSelectOptionsWithLegacy, floorToExaminationTimeSlot } from './examination-time-options.utils';

describe('examination-time-options.utils', () => {
    it('saati 15 dk dilimine aşağı yuvarlar; dilimdeki saat değişmez; bozuk biçim olduğu gibi kalır', () => {
        expect(floorToExaminationTimeSlot('09:14')).toBe('09:00');
        expect(floorToExaminationTimeSlot('09:15')).toBe('09:15');
        expect(floorToExaminationTimeSlot('23:59')).toBe('23:45');
        expect(floorToExaminationTimeSlot('00:07')).toBe('00:00');
        expect(floorToExaminationTimeSlot('9:14')).toBe('9:14');
    });

    it('yeni muayene varsayılanı: bugün (İstanbul) ve şimdinin dilime yuvarlanmış saati', () => {
        expect(defaultExaminationDateTimeParts(new Date('2026-10-08T06:14:00Z'))).toEqual({ date: '2026-10-08', time: '09:00' });
        // UTC gece yarısından önce, İstanbul'da ertesi gün.
        expect(defaultExaminationDateTimeParts(new Date('2026-10-08T21:37:00Z'))).toEqual({ date: '2026-10-09', time: '00:30' });
    });

    it('varsayılan saat her zaman seçenek listesinde bulunur', () => {
        const { time } = defaultExaminationDateTimeParts(new Date('2026-10-08T06:14:00Z'));

        expect(examinationTimeSelectOptionsWithLegacy(time).some((o) => o.label.startsWith('Mevcut saat'))).toBe(false);
    });
});
