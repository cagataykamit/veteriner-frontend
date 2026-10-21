import { FormControl } from '@angular/forms';
import {
    isValidNationalId,
    isValidTaxNumber,
    isValidTaxpayerIdentity,
    isValidTaxRatePercent,
    nationalIdValidator,
    taxNumberValidator,
    taxRateValidator
} from '@/app/shared/utils/turkish-tax-identity.utils';

/** Backend `TurkishTaxIdentityTests` ile aynı test vektörleri. */
describe('turkish-tax-identity.utils', () => {
    it('TCKN geçerli vektörleri kabul eder', () => {
        for (const v of ['10000000146', '12345678950', '23456789138', '19090909018', ' 10000000146 ']) {
            expect(isValidNationalId(v)).withContext(v).toBeTrue();
        }
    });

    it('TCKN geçersizleri reddeder', () => {
        for (const v of [null, '', '12345678901', '12345678940', '12345678951', '02345678950', '1000000014', '1000000014a']) {
            expect(isValidNationalId(v)).withContext(String(v)).toBeFalse();
        }
    });

    it('VKN geçerli ve geçersiz vektörler', () => {
        for (const v of ['1234567890', '9876543217', '0000000001']) {
            expect(isValidTaxNumber(v)).withContext(v).toBeTrue();
        }

        for (const v of ['1234567891', '9876543210', '0000000000', '123456789', '12345678a0']) {
            expect(isValidTaxNumber(v)).withContext(v).toBeFalse();
        }
    });

    it('mükellef kimliği uzunluğa göre kural seçer', () => {
        expect(isValidTaxpayerIdentity('1234567890')).toBeTrue();
        expect(isValidTaxpayerIdentity('10000000146')).toBeTrue();
        expect(isValidTaxpayerIdentity('10000000147')).toBeFalse();
    });

    it('oran kuralı', () => {
        expect(isValidTaxRatePercent(null)).toBeTrue();
        expect(isValidTaxRatePercent(20)).toBeTrue();
        expect(isValidTaxRatePercent(17.5)).toBeTrue();
        expect(isValidTaxRatePercent(20.1)).toBeTrue();
        expect(isValidTaxRatePercent(101)).toBeFalse();
        expect(isValidTaxRatePercent(-1)).toBeFalse();
        expect(isValidTaxRatePercent(20.555)).toBeFalse();
    });

    it('doğrulayıcılar boşu geçerli sayar, hatalıyı işaretler', () => {
        expect(nationalIdValidator()(new FormControl(''))).toBeNull();
        expect(nationalIdValidator()(new FormControl('12345678901'))).toEqual({ nationalId: true });
        expect(taxNumberValidator()(new FormControl('1234567890'))).toBeNull();
        expect(taxNumberValidator()(new FormControl('1234567891'))).toEqual({ taxNumber: true });
        expect(taxRateValidator()(new FormControl<number | null>(150))).toEqual({ taxRate: true });
    });
});
