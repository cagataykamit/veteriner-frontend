import type { ClientBalanceDto } from '@/app/features/clients/models/client-balance-api.model';
import { mapClientBalanceDtoToVm } from './client-balance.mapper';

const charge = (chargeId: string, over: object = {}) => ({
    chargeId,
    clinicId: 'c1',
    examinationId: null,
    description: 'Genel muayene',
    amount: 1000,
    allocatedAmount: 400,
    outstandingAmount: 600,
    createdAtUtc: '2026-10-10T07:00:00Z',
    ...over
});

describe('mapClientBalanceDtoToVm', () => {
    it('hayvan ve ziyaret ağacını sırayı koruyarak düzleştirir', () => {
        const dto: ClientBalanceDto = {
            clientId: 'cl1',
            clientName: 'Ali Veli',
            currency: 'TRY',
            chargedAmount: 1500,
            allocatedAmount: 400,
            outstandingAmount: 1100,
            openChargeCount: 2,
            pets: [
                {
                    petId: 'p1',
                    petName: 'Pamuk',
                    outstandingAmount: 600,
                    visits: [{ visitId: 'v1', visitArrivedAtUtc: '2026-10-10T07:00:00Z', outstandingAmount: 600, charges: [charge('ch1', { examinationId: 'ex1' })] }]
                },
                {
                    petId: null,
                    petName: null,
                    outstandingAmount: 500,
                    visits: [{ visitId: null, visitArrivedAtUtc: null, outstandingAmount: 500, charges: [charge('ch2', { amount: 500, allocatedAmount: 0, outstandingAmount: 500 })] }]
                }
            ]
        };

        const vm = mapClientBalanceDtoToVm(dto);

        expect(vm.outstandingAmount).toBe(1100);
        expect(vm.openCharges.map((c) => c.chargeId)).toEqual(['ch1', 'ch2']);
        expect(vm.openCharges[0]).toEqual(
            jasmine.objectContaining({ petId: 'p1', petName: 'Pamuk', visitId: 'v1', examinationId: 'ex1', outstandingAmount: 600 })
        );
        expect(vm.openCharges[1]).toEqual(jasmine.objectContaining({ petId: null, visitId: null, visitArrivedAtUtc: null }));
    });

    it('açık ücreti olmayan müşteride boş liste döner', () => {
        const vm = mapClientBalanceDtoToVm({
            clientId: 'cl1',
            currency: 'TRY',
            chargedAmount: 0,
            allocatedAmount: 0,
            outstandingAmount: 0,
            openChargeCount: 0,
            pets: []
        });

        expect(vm.openCharges).toEqual([]);
        expect(vm.clientName).toBe('—');
    });
});
