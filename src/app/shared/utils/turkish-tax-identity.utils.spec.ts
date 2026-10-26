import { FormControl } from '@angular/forms';
import { isValidNationalId, isValidTaxNumber, isValidTaxpayerIdentity, isValidTaxRatePercent, nationalIdValidator, taxpayerIdentityValidator, taxRateValidator } from '@/app/shared/utils/turkish-tax-identity.utils';

/** Backend `TurkishTaxIdentityTests` ile aynı test vektörleri. */
describe('turkish-tax-identity.utils', () => {
    it('TCKN geçerli vektörleri kabul eder', () => {
        for (const v of ['10000000146', '12345678950', '23456789138', '19090909018', ' 10000000146 ']) {
            expect(isValidNationalId(v), v).toBe(true);
        }
    });

    it('TCKN geçersizleri reddeder', () => {
        for (const v of [null, '', '12345678901', '12345678940', '12345678951', '02345678950', '1000000014', '1000000014a']) {
            expect(isValidNationalId(v), String(v)).toBe(false);
        }
    });

    it('VKN geçerli ve geçersiz vektörler', () => {
        for (const v of ['1234567890', '9876543217', '0000000001']) {
            expect(isValidTaxNumber(v), v).toBe(true);
        }

        for (const v of ['1234567891', '9876543210', '0000000000', '123456789', '12345678a0']) {
            expect(isValidTaxNumber(v), v).toBe(false);
        }
    });

    it('mükellef kimliği uzunluğa göre kural seçer', () => {
        expect(isValidTaxpayerIdentity('1234567890')).toBe(true);
        expect(isValidTaxpayerIdentity('10000000146')).toBe(true);
        expect(isValidTaxpayerIdentity('1234567891')).toBe(false);
        expect(isValidTaxpayerIdentity('10000000147')).toBe(false);
        expect(isValidTaxpayerIdentity('123456789012')).toBe(false);
    });

    it('oran kuralı', () => {
        expect(isValidTaxRatePercent(null)).toBe(true);
        expect(isValidTaxRatePercent(20)).toBe(true);
        expect(isValidTaxRatePercent(17.5)).toBe(true);
        expect(isValidTaxRatePercent(20.1)).toBe(true);
        expect(isValidTaxRatePercent(101)).toBe(false);
        expect(isValidTaxRatePercent(-1)).toBe(false);
        expect(isValidTaxRatePercent(20.555)).toBe(false);
    });

    it('doğrulayıcılar boşu geçerli sayar, hatalıyı işaretler', () => {
        expect(nationalIdValidator()(new FormControl(''))).toBeNull();
        expect(nationalIdValidator()(new FormControl('12345678901'))).toEqual({ nationalId: true });
        expect(taxpayerIdentityValidator()(new FormControl('1234567890'))).toBeNull();
        expect(taxpayerIdentityValidator()(new FormControl('10000000146'))).toBeNull();
        expect(taxpayerIdentityValidator()(new FormControl('1234567891'))).toEqual({ taxpayerIdentity: true });
        expect(taxRateValidator()(new FormControl<number | null>(150))).toEqual({ taxRate: true });
    });
});
