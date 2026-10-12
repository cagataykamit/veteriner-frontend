import { mapPaymentDetailDtoToVm, mapPaymentListItemDtoToVm, MULTIPLE_PETS_LABEL } from '@/app/features/payments/data/payment.mapper';

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