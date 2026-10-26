import { mapPaymentDetailDtoToVm, mapPaymentListItemDtoToVm, MULTIPLE_PETS_LABEL, paymentsQueryToHttpParams } from '@/app/features/payments/data/payment.mapper';

describe('payment mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [paidFromUtc, paidToUtc] olarak gönderir', () => {
        const p = paymentsQueryToHttpParams({ paidFromDate: '2026-10-08', paidToDate: '2026-10-08' });

        expect(p.get('paidFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('paidToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın ödeme doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = paymentsQueryToHttpParams({ paidFromDate: '2026-10-08', paidToDate: '2026-10-08' });
        const from = Date.parse(p.get('paidFromUtc')!);
        const to = Date.parse(p.get('paidToUtc')!);

        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = paymentsQueryToHttpParams({ paidFromDate: '2026-10-01', paidToDate: '2026-10-31' });

        expect(p.get('paidFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('paidToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = paymentsQueryToHttpParams({ paidFromDate: '2026-10-08', paidToDate: '2026-10-09' });

        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate', 'dateFromUtc', 'dateToUtc']) {
            expect(withDates.has(k)).toBe(false);
        }

        const none = paymentsQueryToHttpParams({});

        expect(none.has('paidFromUtc')).toBe(false);
        expect(none.has('paidToUtc')).toBe(false);
    });

    it('yalnızca bitiş verilirse yalnızca paidToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = paymentsQueryToHttpParams({ paidToDate: '2026-10-08' });

        expect(onlyTo.has('paidFromUtc')).toBe(false);
        expect(onlyTo.get('paidToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = paymentsQueryToHttpParams({ paidFromDate: 'abc', paidToDate: '  ' });

        expect(invalid.has('paidFromUtc')).toBe(false);
        expect(invalid.has('paidToUtc')).toBe(false);
    });
});

describe('payment.mapper petCount', () => {
    it('liste: petCount > 1 ise "Birden fazla hayvan" etiketi, petId null', () => {
        const vm = mapPaymentListItemDtoToVm({ id: 'p1', petId: null, petName: '', petCount: 2 });

        expect(vm.petId).toBeNull();
        expect(vm.petName).toBe(MULTIPLE_PETS_LABEL);
    });

    it('liste: tek hayvanda gerçek ad, petCount yoksa (Query DB) değişmez', () => {
        expect(mapPaymentListItemDtoToVm({ id: 'p1', petId: 'a', petName: 'Mavis', petCount: 1 }).petName).toBe('Mavis');
        expect(mapPaymentListItemDtoToVm({ id: 'p1', petId: 'a', petName: 'Mavis', petCount: null }).petName).toBe('Mavis');
        expect(mapPaymentListItemDtoToVm({ id: 'p1', petId: null, petName: '', petCount: 0 }).petName).toBe('');
    });

    it('detay: petCount > 1 ise etiket ve hasMultiplePets', () => {
        const vm = mapPaymentDetailDtoToVm({ id: 'p1', petId: null, petName: '', petCount: 3 });

        expect(vm.petName).toBe(MULTIPLE_PETS_LABEL);
        expect(vm.hasMultiplePets).toBe(true);
        expect(mapPaymentDetailDtoToVm({ id: 'p1', petName: 'Mavis', petCount: 1 }).hasMultiplePets).toBe(false);
    });
});
