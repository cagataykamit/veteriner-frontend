import { allocationAmountError, allocationTotal, buildAllocations, creditApplyError, receivedAmountError, receivedCreditAmount } from './payment-allocation.utils';

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

    describe('alınan tutar ve kredi', () => {
        it('boş alınan tutar hata değildir ve kredi doğurmaz', () => {
            expect(receivedAmountError(null, 600)).toBeNull();
            expect(receivedCreditAmount(null, 600)).toBe(0);
        });

        it('toplamın altı reddedilir; eşit ya da fazlası geçerlidir', () => {
            expect(receivedAmountError(599.99, 600)).toBe('Alınan tutar seçilen ücretlerin toplamından az olamaz.');
            expect(receivedAmountError(600, 600)).toBeNull();
            expect(receivedAmountError(1000, 600)).toBeNull();
        });

        it('sıfır, negatif ve 2 ondalıktan fazla reddedilir', () => {
            expect(receivedAmountError(0, 0)).toBe('Geçerli bir tutar girin.');
            expect(receivedAmountError(-5, 0)).toBe('Geçerli bir tutar girin.');
            expect(receivedAmountError(10.123, 0)).toBe('En fazla 2 ondalık girin.');
        });

        it('fazlası kuruş hatasız krediye yazılır; avansta tamamı kredidir', () => {
            expect(receivedCreditAmount(1000, 600)).toBe(400);
            expect(receivedCreditAmount(0.3, 0.1)).toBe(0.2);
            expect(receivedCreditAmount(500, 0)).toBe(500);
            expect(receivedCreditAmount(500, 600)).toBe(0);
        });
    });

    describe('creditApplyError', () => {
        it('kullanılabilir krediye eşit ya da altı geçerli, fazlası reddedilir', () => {
            expect(creditApplyError(150, 150)).toBeNull();
            expect(creditApplyError(0.3, 0.3)).toBeNull();
            expect(creditApplyError(150.01, 150)).toBe('Seçilen tutar kullanılabilir krediyi aşamaz.');
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
