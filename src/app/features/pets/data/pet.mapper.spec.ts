import { mapPetDetailDtoToVm, mapPetListItemDtoToVm, mapPetStatusUpdateResultDtoToVm, mapPetStatusUpdateToApiBody, petsQueryToHttpParams } from '@/app/features/pets/data/pet.mapper';
import { parsePetLifeStatus } from '@/app/features/pets/utils/pet-status.utils';

describe('pet.mapper hayvan durumu (ADR-020 S5)', () => {
    it('durum metin veya enum sayısından okunur; eksik/bilinmeyen değer aktiftir', () => {
        expect(parsePetLifeStatus('Deceased')).toBe('Deceased');
        expect(parsePetLifeStatus(2)).toBe('Deceased');
        expect(parsePetLifeStatus('Active')).toBe('Active');
        expect(parsePetLifeStatus(1)).toBe('Active');
        expect(parsePetLifeStatus(undefined)).toBe('Active');
        expect(parsePetLifeStatus('Lost')).toBe('Active');
    });

    it('liste satırı durumu taşır', () => {
        expect(mapPetListItemDtoToVm({ id: 'p1', name: 'Pamuk', status: 'Deceased' }).status).toBe('Deceased');
        expect(mapPetListItemDtoToVm({ id: 'p2', name: 'Boncuk' }).status).toBe('Active');
    });

    it('detay vefat tarihini yalnız vefat edende ve rowVersion ile okur', () => {
        const deceased = mapPetDetailDtoToVm({ id: 'p1', status: 'Deceased', deceasedOn: '2026-10-14', rowVersion: 'AAAAAAAAB9E=' });

        expect([deceased.status, deceased.deceasedOn, deceased.rowVersion]).toEqual(['Deceased', '2026-10-14', 'AAAAAAAAB9E=']);
        const active = mapPetDetailDtoToVm({ id: 'p2', status: 'Active', deceasedOn: '2026-10-14' });

        expect([active.status, active.deceasedOn, active.rowVersion]).toEqual(['Active', null, null]);
    });

    it('durum gövdesi: tarih yalnız vefatta ve doluysa gider', () => {
        expect(mapPetStatusUpdateToApiBody({ status: 'Deceased', deceasedOn: '2026-10-14', rowVersion: 'rv' })).toEqual({ status: 'Deceased', deceasedOn: '2026-10-14', rowVersion: 'rv' });
        expect(mapPetStatusUpdateToApiBody({ status: 'Deceased', deceasedOn: null, rowVersion: 'rv' })).toEqual({ status: 'Deceased', rowVersion: 'rv' });
        expect(mapPetStatusUpdateToApiBody({ status: 'Active', deceasedOn: '2026-10-14', rowVersion: 'rv' })).toEqual({ status: 'Active', rowVersion: 'rv' });
    });

    it('durum yanıtı yeni rowVersion ile eşlenir', () => {
        expect(mapPetStatusUpdateResultDtoToVm({ id: 'p1', status: 'Active', deceasedOn: null, rowVersion: 'new' })).toEqual({ status: 'Active', deceasedOn: null, rowVersion: 'new' });
    });

    it('liste sorgusu Status süzgecini yalnız verilirse gönderir', () => {
        expect(petsQueryToHttpParams({ clientId: 'c1', status: 'Active' }).get('Status')).toBe('Active');
        expect(petsQueryToHttpParams({ clientId: 'c1' }).has('Status')).toBe(false);
    });
});
