import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import type { ClientSearchResultVm } from '@/app/features/clients/services/client-search.service';
import type { PetDetailVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { GlobalSearchService } from './global-search.service';

const ali: ClientSearchResultVm = { id: 'c1', fullName: 'Ali Veli', phone: '+90 532 123 45 67', petNames: ['Pamuk'], label: 'Ali Veli — +90 532 123 45 67' };
const listItem = (id: string, name: string): PetListItemVm => ({ id, clientId: 'c1', speciesId: null, name, speciesName: 'Kedi', breed: 'Tekir', colorName: '—', weight: '—', status: 'Active' });
const detail = (id: string, name: string): PetDetailVm =>
    ({ id, name, ownerId: 'c1', speciesName: 'Kedi', breed: 'Tekir', clientName: 'Ali Veli', clientPhone: '05321234567', microchipNumber: '985112345678901' }) as PetDetailVm;

describe('GlobalSearchService', () => {
    let claims: Set<string>;
    let clientSearch: jasmine.SpyObj<ClientSearchService>;
    let pets: jasmine.SpyObj<PetsService>;
    let service: GlobalSearchService;

    beforeEach(() => {
        claims = new Set(['Clients.Read', 'Pets.Read']);
        clientSearch = jasmine.createSpyObj<ClientSearchService>('ClientSearchService', ['search']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets', 'getPetById']);
        clientSearch.search.and.returnValue(of([ali]));
        pets.getPets.and.returnValue(of({ items: [listItem('p1', 'Pamuk')], page: 1, pageSize: 5, totalItems: 1, totalPages: 1 }));
        pets.getPetById.and.returnValue(of(detail('p1', 'Pamuk')));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: ClientSearchService, useValue: clientSearch },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(GlobalSearchService);
    });

    it('müşteri ve hayvanları getirir; hayvana sahip, telefon ve mikroçip detaydan eklenir', (done) => {
        service.search(' pamuk ').subscribe((r) => {
            expect(clientSearch.search).toHaveBeenCalledWith(' pamuk ');
            expect(pets.getPets).toHaveBeenCalledWith({ page: 1, pageSize: 5, search: 'pamuk' });
            expect(r.clients).toEqual([ali]);
            expect(r.pets).toEqual([
                { id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67', microchip: '985112345678901', deceased: false }
            ]);
            expect(r.failedKinds).toEqual([]);
            done();
        });
    });

    it('Clients.Read yoksa müşteri sorgulanmaz', (done) => {
        claims = new Set(['Pets.Read']);
        service.search('pamuk').subscribe((r) => {
            expect(clientSearch.search).not.toHaveBeenCalled();
            expect(r.clients).toEqual([]);
            expect(r.pets.length).toBe(1);
            done();
        });
    });

    it('Pets.Read yoksa hayvan sorgulanmaz', (done) => {
        claims = new Set(['Clients.Read']);
        service.search('ali').subscribe((r) => {
            expect(pets.getPets).not.toHaveBeenCalled();
            expect(r.pets).toEqual([]);
            expect(r.clients).toEqual([ali]);
            done();
        });
    });

    it('canSearch: en az bir okuma izni gerekir', () => {
        expect(service.canSearch()).toBeTrue();
        claims = new Set(['Pets.Read']);
        expect(service.canSearch()).toBeTrue();
        claims = new Set();
        expect(service.canSearch()).toBeFalse();
    });

    it('bir tür başarısız olursa diğeri gösterilir ve başarısız tür bildirilir', (done) => {
        clientSearch.search.and.returnValue(throwError(() => new Error('x')));
        service.search('pamuk').subscribe((r) => {
            expect(r.clients).toEqual([]);
            expect(r.pets.length).toBe(1);
            expect(r.failedKinds).toEqual(['clients']);
            done();
        });
    });

    it('hayvan detayı alınamazsa liste satırı adıyla gösterilir', (done) => {
        pets.getPetById.and.returnValue(throwError(() => new Error('x')));
        service.search('pamuk').subscribe((r) => {
            expect(r.pets).toEqual([{ id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: '', ownerPhone: '', microchip: '', deceased: false }]);
            expect(r.failedKinds).toEqual([]);
            done();
        });
    });

    it('sonuç yoksa detay çağrılmaz', (done) => {
        pets.getPets.and.returnValue(of({ items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0 }));
        service.search('yok').subscribe((r) => {
            expect(pets.getPetById).not.toHaveBeenCalled();
            expect(r.pets).toEqual([]);
            done();
        });
    });
});
