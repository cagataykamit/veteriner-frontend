import { calculateDose } from './dose-calculation.utils';

describe('calculateDose (EXAM-008)', () => {
    it('kilo × doz/kg toplam dozu, konsantrasyonla hacmi verir', () => {
        const r = calculateDose({ weightKg: 12.4, dosePerKg: 5, doseUnit: 'mg', concentrationMgPerMl: 50 })!;

        expect(r.totalDose).toBeCloseTo(62);
        expect(r.volumeMl).toBeCloseTo(1.24);
        expect(r.text).toBe('12,4 kg × 5 mg/kg = 62 mg → 62 mg ÷ 50 mg/mL = 1,24 mL');
    });

    it('konsantrasyon yoksa yalnız toplam doz', () => {
        const r = calculateDose({ weightKg: 4, dosePerKg: 2.5, doseUnit: 'mg', concentrationMgPerMl: null })!;

        expect(r.volumeMl).toBeNull();
        expect(r.text).toBe('4 kg × 2,5 mg/kg = 10 mg');
    });

    it('µg/kg dozu hacim için mg’a çevirir', () => {
        const r = calculateDose({ weightKg: 20, dosePerKg: 10, doseUnit: 'mcg', concentrationMgPerMl: 0.5 })!;

        expect(r.totalDose).toBe(200);
        expect(r.totalMg).toBeCloseTo(0.2);
        expect(r.volumeMl).toBeCloseTo(0.4);
        expect(r.text).toBe('20 kg × 10 µg/kg = 200 µg → 0,2 mg ÷ 0,5 mg/mL = 0,4 mL');
    });

    it('eksik, sıfır, negatif veya sınır dışı girişte sonuç vermez', () => {
        expect(calculateDose({ weightKg: null, dosePerKg: 5, doseUnit: 'mg', concentrationMgPerMl: null })).toBeNull();
        expect(calculateDose({ weightKg: 10, dosePerKg: 0, doseUnit: 'mg', concentrationMgPerMl: null })).toBeNull();
        expect(calculateDose({ weightKg: -1, dosePerKg: 5, doseUnit: 'mg', concentrationMgPerMl: null })).toBeNull();
        expect(calculateDose({ weightKg: 10, dosePerKg: 5, doseUnit: 'mg', concentrationMgPerMl: 0 })).toBeNull();
        expect(calculateDose({ weightKg: 5000, dosePerKg: 5, doseUnit: 'mg', concentrationMgPerMl: null })).toBeNull();
    });
});
