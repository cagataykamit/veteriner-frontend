import type { VaccineDefinitionListItemVm } from '@/app/entities/vaccine-definition/models/vaccine-definition-vm.model';
import { groupVaccineDefinitionOptions, parseVaccineCategory } from './vaccine-category.utils';

const row = (id: string, name: string, category: VaccineDefinitionListItemVm['category']): VaccineDefinitionListItemVm => ({
    id,
    tenantId: null,
    speciesId: null,
    name,
    code: id.toUpperCase(),
    description: null,
    defaultNextDueDays: null,
    isCore: true,
    isActive: true,
    category
});

describe('vaccine-category.utils', () => {
    it('bilinmeyen ya da eksik sınıfı null okur', () => {
        expect(parseVaccineCategory('NonCore')).toBe('NonCore');
        expect(parseVaccineCategory('core')).toBeNull();
        expect(parseVaccineCategory(undefined)).toBeNull();
    });

    it('tanımları sınıfa göre gruplar; önerilmeyen en sonda, boş grup yok', () => {
        const groups = groupVaccineDefinitionOptions([
            row('fip', 'FIP', 'NotRecommended'),
            row('rabies', 'Kuduz', 'Core'),
            row('ic', 'İç Parazit', 'ParasiteControl'),
            row('sap', 'Şap', null)
        ]);

        expect(groups.map((g) => g.label)).toEqual([
            'Çekirdek aşılar',
            'Antiparaziter uygulamalar',
            'Diğer aşılar',
            'Önerilmeyen aşılar (WSAVA)'
        ]);
        expect(groups[0].items).toEqual([{ label: 'Kuduz', value: 'rabies' }]);
    });
});
