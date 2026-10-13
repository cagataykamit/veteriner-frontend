import { mapOutstandingBalancesReportDtoToVm } from '@/app/features/reports/outstanding-balances/data/outstanding-balances-report.mapper';

describe('outstanding balances report mapper', () => {
    it('özet, satırlar ve sayfa bilgisini eşler; telefon yoksa null', () => {
        const vm = mapOutstandingBalancesReportDtoToVm(
            {
                currency: 'TRY',
                totalCount: 2,
                totalOutstandingAmount: 690,
                items: [
                    { clientId: 'a', clientName: 'Ayşe', phone: '905321112233', outstandingAmount: 600, openChargeCount: 2, oldestOpenChargeAtUtc: '2026-10-01T07:00:00Z' },
                    { clientId: 'b', clientName: 'Bora', phone: null, outstandingAmount: 90, openChargeCount: 1, oldestOpenChargeAtUtc: '2026-10-05T07:00:00Z' }
                ]
            },
            { page: 1, pageSize: 25 }
        );
        expect(vm.totalCount).toBe(2);
        expect(vm.totalOutstandingAmount).toBe(690);
        expect(vm.items.map((i) => i.clientId)).toEqual(['a', 'b']);
        expect(vm.items[0].id).toBe('a');
        expect(vm.items[0].phone).toBe('+90 532 111 22 33');
        expect(vm.items[1].phone).toBeNull();
        expect(vm.page).toBe(1);
    });

    it('eksik alanlarda güvenli varsayılanlar', () => {
        const vm = mapOutstandingBalancesReportDtoToVm({ totalCount: 0, totalOutstandingAmount: 0 }, { page: 1, pageSize: 25 });
        expect(vm.items).toEqual([]);
        expect(vm.currency).toBe('TRY');
    });
});
