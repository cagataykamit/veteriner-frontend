import { FormControl } from '@angular/forms';
import { chargeNumberValidator, computeChargeAmount, hasAtMostDecimals } from '@/app/features/charges/utils/charge-amount.utils';

describe('computeChargeAmount', () => {
    it('miktar × birim fiyatı 2 haneye yuvarlar', () => {
        expect(computeChargeAmount(1, 750)).toBe(750);
        expect(computeChargeAmount(2.5, 19.99)).toBe(49.98);
        expect(computeChargeAmount(0.333, 10)).toBe(3.33);
    });

    it('yarım değerde sıfırdan uzağa yuvarlar (AwayFromZero)', () => {
        expect(computeChargeAmount(0.001, 5)).toBe(0.01);
        expect(computeChargeAmount(1.005, 1)).toBe(1.01);
        expect(computeChargeAmount(0.5, 0.01)).toBe(0.01);
    });

    it('kayan nokta hatasından etkilenmez', () => {
        expect(computeChargeAmount(3, 0.1)).toBe(0.3);
        expect(computeChargeAmount(1.1, 1.1)).toBe(1.21);
    });

    it('üst sınırlarda doğru hesaplar', () => {
        expect(computeChargeAmount(100000, 10000000)).toBe(1000000000000);
    });

    it('tutar sıfıra yuvarlanırsa veya girdi geçersizse null', () => {
        expect(computeChargeAmount(0.001, 1)).toBeNull();
        expect(computeChargeAmount(0, 10)).toBeNull();
        expect(computeChargeAmount(1, 0)).toBeNull();
        expect(computeChargeAmount(-1, 10)).toBeNull();
        expect(computeChargeAmount(null, 10)).toBeNull();
        expect(computeChargeAmount(1, null)).toBeNull();
        expect(computeChargeAmount(1.0001, 10)).toBeNull();
        expect(computeChargeAmount(1, 10.001)).toBeNull();
    });
});

describe('hasAtMostDecimals', () => {
    it('ondalık sayısını sınırlar', () => {
        expect(hasAtMostDecimals(1.25, 2)).toBeTrue();
        expect(hasAtMostDecimals(1.255, 2)).toBeFalse();
        expect(hasAtMostDecimals(0.1 + 0.2, 2)).toBeTrue();
    });
});

describe('chargeNumberValidator', () => {
    const validate = (v: unknown) => chargeNumberValidator(100, 2)(new FormControl(v));

    it('geçerli değer ve boş değer (required ayrı) hata vermez', () => {
        expect(validate(10.5)).toBeNull();
        expect(validate(null)).toBeNull();
    });

    it('sıfır, negatif, sınır üstü ve fazla ondalıkta hata verir', () => {
        expect(validate(0)).toEqual({ chargePositive: true });
        expect(validate(-1)).toEqual({ chargePositive: true });
        expect(validate(100.01)).toEqual({ chargeMax: { max: 100 } });
        expect(validate(1.234)).toEqual({ chargeDecimals: { decimals: 2 } });
    });
});
