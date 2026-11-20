import { completesWithoutCharge, computeTotals, creditError, itemAmount, lineError, parseAmount, planAllocations } from './visit-checkout.rules';

describe('visit-checkout.rules', () => {
    it('parseAmount virgülü ve boşluğu kabul eder, boşta null döner', () => {
        expect(parseAmount('1 250,5')).toBe(1250.5);
        expect(parseAmount('')).toBeNull();
        expect(parseAmount('abc')).toBeNull();
    });

    it('itemAmount fiyat yoksa null, varsa miktarla çarpar', () => {
        expect(itemAmount(2, 120)).toBe(240);
        expect(itemAmount(1, null)).toBeNull();
    });

    it('computeTotals kalanı ve fazlayı ayırır', () => {
        expect(computeTotals(1630, 500, 1000)).toEqual({ due: 1630, credit: 500, paid: 1000, remaining: 130, overpaid: 0 });
        expect(computeTotals(100, 0, 150)).toEqual({ due: 100, credit: 0, paid: 150, remaining: 0, overpaid: 50 });
    });

    it('lineError boş ve sıfır tutarı reddeder', () => {
        expect(lineError({ amount: null })).toBe('Tutar girin.');
        expect(lineError({ amount: 0 })).toBe('Tutar sıfırdan büyük olmalı.');
        expect(lineError({ amount: 10 })).toBeNull();
    });

    it('creditError bakiyeyi ve hesabı aşan krediyi reddeder', () => {
        expect(creditError(600, 500, 1000)).toBe('Kullanılabilir krediden fazla.');
        expect(creditError(400, 500, 300)).toBe('Krediden hesaptan fazla düşülemez.');
        expect(creditError(300, 500, 300)).toBeNull();
    });

    it('planAllocations önce krediyi, sonra satırları sırayla dağıtır; fazlası son satırın kredisi olur', () => {
        const plan = planAllocations(
            [
                { chargeId: 'a', outstanding: 600 },
                { chargeId: 'b', outstanding: 850 },
                { chargeId: 'c', outstanding: 180 }
            ],
            500,
            [630, 600]
        );

        expect(plan.credit).toEqual([{ chargeId: 'a', amount: 500 }]);
        expect(plan.lines[0]).toEqual({
            allocations: [
                { chargeId: 'a', amount: 100 },
                { chargeId: 'b', amount: 530 }
            ],
            creditAmount: 0
        });
        expect(plan.lines[1]).toEqual({
            allocations: [
                { chargeId: 'b', amount: 320 },
                { chargeId: 'c', amount: 180 }
            ],
            creditAmount: 100
        });
    });

    it('planAllocations kısmi ödemede kalan ücreti açık bırakır', () => {
        const plan = planAllocations([{ chargeId: 'a', outstanding: 1630 }], 0, [1000]);

        expect(plan.lines).toEqual([{ allocations: [{ chargeId: 'a', amount: 1000 }], creditAmount: 0 }]);
    });

    it('completesWithoutCharge yalnız ücretlenecek hiçbir şey yokken true', () => {
        expect(completesWithoutCharge(0, 0, 0)).toBe(true);
        expect(completesWithoutCharge(0, 0, 1)).toBe(false);
        expect(completesWithoutCharge(1, 0, 0)).toBe(false);
        expect(completesWithoutCharge(0, 2, 0)).toBe(false);
    });
});
