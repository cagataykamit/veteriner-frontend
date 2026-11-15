import { of } from 'rxjs';
import type { SpeciesService } from '@/app/entities/species/services/species.service';
import { createSpeciesByName, speciesCodeFromName } from './species-inline-create.utils';

describe('tür yerinde ekleme (O1)', () => {
    it('addan ASCII büyük harf kod türetir', () => {
        expect(speciesCodeFromName('  Gine domuzu ')).toBe('GINE_DOMUZU');
        expect(speciesCodeFromName('Çöl şahini')).toBe('COL_SAHINI');
        expect(speciesCodeFromName('x'.repeat(40))).toHaveLength(32);
    });

    it('adla aktif tür oluşturur ve kimliği döndürür', () => {
        const createSpecies = vi.fn().mockReturnValue(of({ id: 's9' }));
        let id = '';

        createSpeciesByName({ createSpecies } as unknown as SpeciesService, ' Kirpi ').subscribe((v) => (id = v));

        expect(createSpecies).toHaveBeenCalledWith({ code: 'KIRPI', name: 'Kirpi', isActive: true, displayOrder: 0 });
        expect(id).toBe('s9');
    });
});
