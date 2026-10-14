import type { VaccinationDetailDto } from '@/app/features/vaccinations/models/vaccination-api.model';
import {
    mapCreateVaccinationToApiBody,
    mapVaccinationCreateResponse,
    mapVaccinationDetailDtoToVm
} from '@/app/features/vaccinations/data/vaccination.mapper';

const base = { clinicId: 'c1', petId: 'p1', vaccineDefinitionId: 'd1', status: 1, appliedAtUtc: '2026-10-14T08:00:00Z' };

describe('vaccination.mapper — aşı + stok düşümü', () => {
    describe('mapCreateVaccinationToApiBody', () => {
        it('ürün yoksa ürün/miktar/parti/requestId gönderilmez (mevcut davranış)', () => {
            const body = mapCreateVaccinationToApiBody({ ...base, productId: null, quantity: 1, batchId: 'b1', requestId: 'r1' });
            expect(body.productId).toBeUndefined();
            expect(body.quantity).toBeUndefined();
            expect(body.batchId).toBeUndefined();
            expect(body.requestId).toBeUndefined();
        });

        it('ürün varsa miktar, requestId ve seçilmişse parti gönderilir; otomatikte parti yok', () => {
            const auto = mapCreateVaccinationToApiBody({ ...base, productId: 'pr1', quantity: 1, batchId: '', requestId: 'r1' });
            expect(auto).toEqual(jasmine.objectContaining({ productId: 'pr1', quantity: 1, requestId: 'r1' }));
            expect(auto.batchId).toBeUndefined();
            const manual = mapCreateVaccinationToApiBody({ ...base, productId: 'pr1', quantity: 0.5, batchId: 'b2', requestId: 'r1' });
            expect(manual.batchId).toBe('b2');
        });
    });

    describe('mapVaccinationCreateResponse', () => {
        it('çıplak guid yanıtında stok sonucu yok', () => {
            expect(mapVaccinationCreateResponse('11111111-1111-1111-1111-111111111111', 'v1')).toEqual({ id: 'v1', stockResult: null });
        });

        it('ürünlü yanıtta uygulama ve kalan stok eşlenir', () => {
            const r = mapVaccinationCreateResponse(
                {
                    created: true,
                    id: 'v1',
                    administration: { id: 'a1', petId: 'p1', productId: 'pr1', productName: 'Nobivac', unit: 'doz', quantity: 1, status: 'Active', administeredAtUtc: '2026-10-14T08:00:00Z', createdAtUtc: '2026-10-14T08:00:00Z', createdByUserId: 'u1', vaccinationId: 'v1', lotNumber: 'L1' },
                    stock: { quantityOnHand: 9, availableQuantity: 8, minimumStockLevel: 2, isBelowMinimum: false }
                },
                'v1'
            );
            expect(r.stockResult?.created).toBeTrue();
            expect(r.stockResult?.administration.vaccinationId).toBe('v1');
            expect(r.stockResult?.stock.availableQuantity).toBe(8);
        });
    });

    describe('mapVaccinationDetailDtoToVm', () => {
        const dto: VaccinationDetailDto = { id: 'v1', petId: 'p1', clientId: 'cl1', vaccineName: 'Karma', status: 1 };

        it('bağlı değilse uygulama özeti null', () => {
            expect(mapVaccinationDetailDtoToVm(dto).linkedAdministration).toBeNull();
        });

        it('bağlıysa ürün, miktar, seri no ve SKT taşınır', () => {
            const vm = mapVaccinationDetailDtoToVm({ ...dto, administrationId: 'a1', productName: 'Nobivac', quantity: 1, unit: 'doz', lotNumber: 'L1', expiryDate: '2027-03-31T00:00:00' });
            expect(vm.linkedAdministration).toEqual({ id: 'a1', productName: 'Nobivac', quantity: 1, unit: 'doz', lotNumber: 'L1', expiryDate: '2027-03-31' });
        });
    });
});
