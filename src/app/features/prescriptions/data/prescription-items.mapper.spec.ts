import { mapCreatePrescriptionToApiBody, mapPrescriptionDetailDtoToEditVm, mapPrescriptionDetailDtoToVm } from '@/app/features/prescriptions/data/prescription.mapper';
import type { PrescriptionDetailDto } from '@/app/features/prescriptions/models/prescription-api.model';
import type { CreatePrescriptionRequest } from '@/app/features/prescriptions/models/prescription-create.model';

const base: CreatePrescriptionRequest = {
    clinicId: 'c1',
    petId: 'p1',
    prescribedAtUtc: '2026-10-13T08:00:00Z',
    title: 'Antibiyotik',
    content: 'Amoksisilin 7 gün'
};

const detail: PrescriptionDetailDto = { id: 'r1', clinicId: 'c1', petId: 'p1', title: 'T', content: 'C' };

describe('reçete satırları (mapper)', () => {
    it('eski reçete (items alanı yok) boş satırla açılır', () => {
        expect(mapPrescriptionDetailDtoToVm(detail).items).toEqual([]);
        expect(mapPrescriptionDetailDtoToEditVm({ ...detail, items: null }).items).toEqual([]);
    });

    it('satırlar sortOrder sırasıyla, ürün bağı ve miktarla eşlenir', () => {
        const vm = mapPrescriptionDetailDtoToVm({
            ...detail,
            items: [
                { id: 'i2', sortOrder: 2, name: 'Serum', productId: 'pr1', instructions: null, quantity: 0.5, dose: ' 5 ml ', unit: 'şişe', lotNumber: 'L-1' },
                { id: 'i1', sortOrder: 1, name: 'Dış ilaç', instructions: 'Günde 2 kez' }
            ]
        });

        expect(vm.items).toEqual([
            { name: 'Dış ilaç', productId: null, instructions: 'Günde 2 kez', quantity: null, dose: '', unit: '', lotNumber: '' },
            { name: 'Serum', productId: 'pr1', instructions: '', quantity: 0.5, dose: '5 ml', unit: 'şişe', lotNumber: 'L-1' }
        ]);
    });

    it('items verilmezse gövdede items alanı yoktur (PUT satırlara dokunmaz)', () => {
        expect('items' in mapCreatePrescriptionToApiBody(base)).toBeFalse();
        expect('items' in mapCreatePrescriptionToApiBody({ ...base, items: undefined })).toBeFalse();
    });

    it('boş dizi gövdeye girer (tüm satırları sil); dolu dizi kırpılarak gider', () => {
        expect(mapCreatePrescriptionToApiBody({ ...base, items: [] }).items).toEqual([]);
        expect(
            mapCreatePrescriptionToApiBody({ ...base, items: [{ name: '  Amoksisilin ', productId: ' ', instructions: ' ', quantity: 14 }] }).items
        ).toEqual([{ name: 'Amoksisilin', productId: null, instructions: null, quantity: 14, dose: null, unit: null, lotNumber: null }]);
    });

    it('doz, birim ve parti/seri no kırpılarak gövdeye girer (ADR-036)', () => {
        expect(
            mapCreatePrescriptionToApiBody({ ...base, items: [{ name: 'Amoksisilin', dose: ' 1 tablet ', unit: ' kutu ', lotNumber: ' L-77 ' }] }).items
        ).toEqual([{ name: 'Amoksisilin', productId: null, instructions: null, quantity: null, dose: '1 tablet', unit: 'kutu', lotNumber: 'L-77' }]);
    });

    it('detaydaki HBS kaydı ve listedeki HBS durumu eşlenir', () => {
        const vm = mapPrescriptionDetailDtoToVm({ ...detail, hbs: { status: 'Entered', referenceNumber: '2RX4K9', markedByName: 'Dr. Ayşe', isTracked: true } });

        expect(vm.hbs).toEqual({ status: 'Entered', referenceNumber: '2RX4K9', notRequiredReason: null, markedAtUtc: null, markedByName: 'Dr. Ayşe', isTracked: true });
        expect(mapPrescriptionDetailDtoToVm(detail).hbs).toBeNull();
    });
});
