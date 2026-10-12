import { allocationAmountError, allocationTotal, buildAllocations } from './payment-allocation.utils';

describe('payment-allocation.utils', () => {
    describe('allocationAmountError', () => {
        it('boş ve sıfır hata değildir (satır gönderilmez)', () => {
            expect(allocationAmountError(null, 600)).toBeNull();
            expect(allocationAmountError(undefined, 600)).toBeNull();
            expect(allocationAmountError(0, 600)).toBeNull();
        });

        it('kalan tutara eşit veya altı geçerli', () => {
            expect(allocationAmountError(600, 600)).toBeNull();
            expect(allocationAmountError(0.01, 600)).toBeNull();
        });

        it('kalan tutarı aşan reddedilir (601 / 600)', () => {
            expect(allocationAmountError(601, 600)).toBe('Kalan tutarı aşamaz.');
            expect(allocationAmountError(600.01, 600)).toBe('Kalan tutarı aşamaz.');
        });

        it('negatif ve 2 ondalıktan fazla reddedilir', () => {
            expect(allocationAmountError(-1, 600)).toBe('Geçerli bir tutar girin.');
            expect(allocationAmountError(10.123, 600)).toBe('En fazla 2 ondalık girin.');
        });
    });

    describe('allocationTotal', () => {
        it('kayan nokta hatası olmadan toplar', () => {
            expect(
                allocationTotal([
                    { chargeId: 'a', amount: 0.1 },
                    { chargeId: 'b', amount: 0.2 }
                ])
            ).toBe(0.3);
        });
    });

    describe('buildAllocations', () => {
        it('yalnız tutarı girilmiş satırları ücret sırasıyla üretir', () => {
            const charges = [
                { chargeId: 'a', outstandingAmount: 600 },
                { chargeId: 'b', outstandingAmount: 300 },
                { chargeId: 'c', outstandingAmount: 100 }
            ];
            expect(buildAllocations(charges, { c: 50, a: 400, b: null })).toEqual([
                { chargeId: 'a', amount: 400 },
                { chargeId: 'c', amount: 50 }
            ]);
        });
    });
});
