import { mapPetSearchInterpretationDtoToVm, mapPetSearchResultDtoToVm } from '@/app/entities/ai/data/ai-pet-search.mapper';

describe('ai-pet-search.mapper', () => {
    it('sonuç satırını kısa ayrıntı, sahip ve kayıt çipleriyle eşler', () => {
        const vm = mapPetSearchResultDtoToVm({
            filter: { species: ['CAT'] },
            items: [
                {
                    petId: 'p1',
                    name: ' Pamuk ',
                    speciesName: 'Kedi',
                    breed: 'Tekir',
                    sex: 'Female',
                    isNeutered: true,
                    ageYears: 3,
                    status: 'Deceased',
                    clientId: 'c1',
                    clientName: 'Deniz Aydın',
                    matches: [
                        { type: 'Examination', id: 'e1', occurredAtUtc: '2026-11-10T09:00:00Z', text: 'Kusma' },
                        { type: 'Vaccination', id: 'v1', occurredAtUtc: '2026-11-01T09:00:00Z', text: 'Karma', isOverdue: true }
                    ]
                },
                { petId: 'p2', name: 'Boncuk', ageYears: 0 }
            ],
            totalCount: 2,
            page: 1,
            pageSize: 25,
            truncated: true,
            omittedTypes: ['Treatment'],
            dropped: [' Bilinmeyen tür: X ', '']
        });

        const [first, second] = vm.items;

        expect(first).toEqual(expect.objectContaining({ name: 'Pamuk', detail: 'Dişi · kısır · 3 yaş · Tekir', isDeceased: true, clientName: 'Deniz Aydın' }));
        expect(first.matches[0].source).toEqual(expect.objectContaining({ type: 'Examination', id: 'e1', link: ['/panel/examinations', 'e1'] }));
        expect(first.matches[1]).toEqual(expect.objectContaining({ text: 'Karma', isOverdue: true }));
        expect(second.detail).toBe('1 yaşından küçük');
        expect(second.matches).toEqual([]);
        expect(vm).toEqual(expect.objectContaining({ totalCount: 2, truncated: true, omittedTypesLabel: 'tedavi', dropped: ['Bilinmeyen tür: X'] }));
    });

    it('yorumlamada boş metinler atılır', () => {
        expect(mapPetSearchInterpretationDtoToVm({ filter: null, isEmpty: true, unsupported: [' ad ile arama ', null as unknown as string], dropped: null })).toEqual({
            isEmpty: true,
            unsupported: ['ad ile arama'],
            dropped: []
        });
    });
});
