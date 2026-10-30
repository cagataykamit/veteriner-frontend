import { mapAdministrationDtoToVm, mapCreateAdministrationToApiBody } from '@/app/entities/administration/data/administration.mapper';
import type { AdministrationDto } from '@/app/entities/administration/models/administration-api.model';

describe('administration.mapper — yol, bölge, üretici (RECORD-005)', () => {
    const req = { petId: 'p1', productId: 'pr1', quantity: 1, requestId: 'r1' };

    it('yol ve bölge yalnız doluysa gönderilir', () => {
        expect(mapCreateAdministrationToApiBody('c1', { ...req, route: 'Intramuscular', site: ' Sağ arka bacak ' })).toEqual(
            expect.objectContaining({ route: 'Intramuscular', site: 'Sağ arka bacak' })
        );
        const bare = mapCreateAdministrationToApiBody('c1', { ...req, route: null, site: '  ' });

        expect('route' in bare).toBe(false);
        expect('site' in bare).toBe(false);
    });

    it('okumada yol, bölge ve üretici taşınır; bilinmeyen yol null', () => {
        const dto = {
            id: 'a1', clinicId: 'c1', petId: 'p1', productId: 'pr1', productName: 'X', unit: 'Adet', quantity: 1,
            administeredAtUtc: '2026-10-30T09:00:00Z', status: 'Active', createdByUserId: 'u1', createdAtUtc: '2026-10-30T09:00:00Z',
            route: 'Telepati', site: 'Boyun', productManufacturer: ' MSD '
        } as AdministrationDto;
        const vm = mapAdministrationDtoToVm(dto);

        expect(vm.route).toBeNull();
        expect(vm.site).toBe('Boyun');
        expect(vm.productManufacturer).toBe('MSD');
        expect(mapAdministrationDtoToVm({ ...dto, route: 'Oral' }).route).toBe('Oral');
    });
});
