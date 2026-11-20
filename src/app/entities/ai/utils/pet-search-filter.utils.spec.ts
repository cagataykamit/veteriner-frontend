import type { PetSearchFilterDto } from '@/app/entities/ai/models/ai-api.model';
import { isPetSearchFilterEmpty, petSearchDateLabel, petSearchFilterChips, removePetSearchChip } from '@/app/entities/ai/utils/pet-search-filter.utils';

const species = new Map([['CAT', 'Kedi']]);

describe('pet-search-filter.utils', () => {
    it('filtreyi okunuş sırasıyla çiplere çevirir; tür adı bilinmezse kod kalır', () => {
        const filter: PetSearchFilterDto = {
            species: ['CAT', 'DOG'],
            sex: 'Female',
            neutered: true,
            ageMinYears: 2,
            ageMaxYears: 5,
            status: 'Active',
            from: '2026-08-19',
            to: '2026-11-19',
            clinicalTerms: ['kusma'],
            vaccineTerms: ['karma'],
            vaccineState: 'Overdue',
            medicationTerms: ['amoksisilin']
        };

        expect(petSearchFilterChips(filter, species).map((c) => c.label)).toEqual([
            'Kedi',
            'DOG',
            'Dişi',
            'Kısırlaştırılmış',
            '2–5 yaş',
            'Yaşayanlar',
            `${petSearchDateLabel('2026-08-19')} – ${petSearchDateLabel('2026-11-19')}`,
            'Şikâyet/tanı: kusma',
            'Aşı: karma',
            'Aşı durumu: gecikmiş',
            'İlaç: amoksisilin'
        ]);
    });

    it('tek uçlu yaş ve tarih aralığını yazar; aşı terimi varken "herhangi" durum çip olmaz', () => {
        const labels = petSearchFilterChips({ ageMinYears: 10, from: '2026-01-01', vaccineTerms: ['kuduz'], vaccineState: 'Any' }, species).map((c) => c.label);

        expect(labels).toEqual(['En az 10 yaş', `${petSearchDateLabel('2026-01-01')} ve sonrası`, 'Aşı: kuduz']);
        expect(petSearchFilterChips({ vaccineState: 'Any' }, species).map((c) => c.label)).toEqual(['Aşı kaydı olan']);
        expect(petSearchFilterChips(null, species)).toEqual([]);
    });

    it('çip kaldırma yalnız o ölçütü çıkarır; son aşı terimiyle "herhangi" durumu da kalkar', () => {
        const filter: PetSearchFilterDto = { species: ['CAT'], clinicalTerms: ['kusma', 'ishal'], vaccineTerms: ['karma'], vaccineState: 'Any', from: '2026-08-19', to: '2026-11-19' };

        expect(removePetSearchChip(filter, 'clinical:kusma').clinicalTerms).toEqual(['ishal']);
        expect(removePetSearchChip(filter, 'species:CAT').species).toBeNull();
        expect(removePetSearchChip(filter, 'period')).toEqual(expect.objectContaining({ from: null, to: null }));

        const noVaccine = removePetSearchChip(filter, 'vaccine:karma');

        expect(noVaccine.vaccineTerms).toBeNull();
        expect(noVaccine.vaccineState).toBeNull();
        expect(removePetSearchChip({ vaccineTerms: ['karma'], vaccineState: 'Overdue' }, 'vaccine:karma').vaccineState).toBe('Overdue');
        expect(removePetSearchChip(filter, 'bilinmeyen')).toBe(filter);
    });

    it('ölçüt kalmadıysa boş sayılır', () => {
        expect(isPetSearchFilterEmpty({})).toBe(true);
        expect(isPetSearchFilterEmpty({ species: [], clinicalTerms: null })).toBe(true);
        expect(isPetSearchFilterEmpty({ neutered: false })).toBe(false);
    });

    it('tarih etiketi İstanbul günü kaymadan yazılır', () => {
        expect(petSearchDateLabel('2026-11-19')).toBe('19 Kas 2026');
        expect(petSearchDateLabel('19.11.2026')).toBe('19.11.2026');
    });
});
