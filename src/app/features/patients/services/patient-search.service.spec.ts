import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { GlobalSearchService, type GlobalSearchResultVm } from '@/app/shared/global-search/global-search.service';
import { PatientSearchService } from './patient-search.service';

const petItem = (id: string, name: string, clientId: string | null = 'c1'): PetListItemVm => ({ id, clientId, speciesId: null, name, speciesName: 'Kedi', breed: 'Tekir', colorName: '—', weight: '—', status: 'Active' });
const page = (items: PetListItemVm[]) => ({ items, page: 1, pageSize: 5, totalItems: items.length, totalPages: 1 });
const ali = { id: 'c1', fullName: 'Ali Veli', phone: '+90 532 123 45 67', petNames: ['Pamuk'], label: 'Ali Veli' };

describe('PatientSearchService', () => {
    let claims: Set<string>;
    let global: jasmine.SpyObj<GlobalSearchService>;
    let pets: jasmine.SpyObj<PetsService>;
    let service: PatientSearchService;

    const run = (result: GlobalSearchResultVm) => {
        global.search.and.returnValue(of(result));
        let out: unknown;
        service.search('x').subscribe((r) => (out = r));
        return out as import('./patient-search.service').PatientSearchResultVm;
    };

    beforeEach(() => {
        claims = new Set(['Pets.Read', 'Clients.Read']);
        global = jasmine.createSpyObj<GlobalSearchService>('GlobalSearchService', ['search', 'canSearch']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets']);
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: GlobalSearchService, useValue: global },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(PatientSearchService);
    });

    it('hayvan eşleşmesi sahip bilgisiyle tek satır olur', () => {
        const r = run({ clients: [], pets: [{ id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67', microchip: '985' }], failedKinds: [] });
        expect(r.patients).toEqual([{ petId: 'p1', petName: 'Pamuk', summary: 'Kedi · Tekir', microchip: '985', clientId: 'c1', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67' }]);
        expect(r.owners).toEqual([]);
    });

    it('sahip adıyla bulunan müşterinin hayvanları eklenir; doğrudan bulunan hayvan tekrarlanmaz', () => {
        pets.getPets.and.returnValue(of(page([petItem('p1', 'Pamuk'), petItem('p2', 'Boncuk')])));
        const r = run({ clients: [ali], pets: [{ id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: 'Ali Veli', ownerPhone: '', microchip: '' }], failedKinds: [] });
        expect(pets.getPets).toHaveBeenCalledWith({ page: 1, pageSize: 5, clientId: 'c1' });
        expect(r.patients.map((p) => p.petId)).toEqual(['p1', 'p2']);
        expect(r.patients[1].ownerName).toBe('Ali Veli');
        expect(r.owners).toEqual([]);
    });

    it('hayvanı olmayan sahip ayrı listelenir', () => {
        pets.getPets.and.returnValue(of(page([])));
        const r = run({ clients: [ali], pets: [], failedKinds: [] });
        expect(r.patients).toEqual([]);
        expect(r.owners).toEqual([{ clientId: 'c1', name: 'Ali Veli', phone: '+90 532 123 45 67' }]);
    });

    it('Pets.Read yoksa sahip hayvanları sorgulanmaz', () => {
        claims.delete('Pets.Read');
        const r = run({ clients: [ali], pets: [], failedKinds: [] });
        expect(pets.getPets).not.toHaveBeenCalled();
        expect(r.owners.length).toBe(1);
    });

    it('başka sahibe ait dönen hayvan süzülür; kısmi hata iletilir', () => {
        pets.getPets.and.returnValue(of(page([petItem('p9', 'Karabaş', 'c2')])));
        const r = run({ clients: [ali], pets: [], failedKinds: ['pets'] });
        expect(r.patients).toEqual([]);
        expect(r.failedKinds).toEqual(['pets']);
    });
});
