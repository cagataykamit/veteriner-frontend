import { mapPetColorListResponseToCoatOptions, mapPetColorListResponseToSelectOptions } from './pet-color.mapper';

describe('pet-color.mapper', () => {
    const raw = [
        { id: 'black', name: 'Siyah', kind: 'Color' },
        { id: 'tabby', name: 'Tekir (Tabby)', kind: 'Pattern' },
        { id: 'old', name: 'Beyaz' }
    ];

    it('renk ve deseni ayrı seçeneklere ayırır; türü olmayan eski satır renktir', () => {
        const { colors, patterns } = mapPetColorListResponseToCoatOptions(raw);

        expect(colors.map((o) => o.value)).toEqual(['black', 'old']);
        expect(patterns).toEqual([{ value: 'tabby', label: 'Tekir (Tabby)' }]);
    });

    it('tam liste (içe aktarma eşleme) renk ve deseni birlikte döner', () => {
        expect(mapPetColorListResponseToSelectOptions(raw).length).toBe(3);
    });
});
