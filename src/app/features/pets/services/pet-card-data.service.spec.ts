import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetOpenItemsVm } from '@/app/features/pets/models/pet-open-items-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { PetCardDataService } from './pet-card-data.service';

describe('PetCardDataService', () => {
    let claims: Set<string>;
    let service: PetCardDataService;
    const clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClientBalance']);
    const chargeSuggestions = jasmine.createSpyObj<ChargeSuggestionsService>('ChargeSuggestionsService', ['getPending']);
    const pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets', 'getPetOpenItems']);

    const collect = <T>(source: { subscribe(fn: (v: PetCardSection<T>) => void): unknown }) => {
        const values: PetCardSection<T>[] = [];
        source.subscribe((v) => values.push(v));
        return values;
    };

    beforeEach(() => {
        claims = new Set(['Pets.Read']);
        pets.getPetOpenItems.calls.reset();
        clients.getClientBalance.calls.reset();
        chargeSuggestions.getPending.calls.reset();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: ClientsService, useValue: clients },
                { provide: ChargeSuggestionsService, useValue: chargeSuggestions },
                { provide: ExaminationsService, useValue: {} },
                { provide: TreatmentsService, useValue: {} },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(PetCardDataService);
    });

    it('hasta Yapılacaklar tek istekte açık işler ucundan okunur; önce yükleniyor, sonra veri yayar', () => {
        const vm = { petId: 'p1' } as PetOpenItemsVm;
        pets.getPetOpenItems.and.returnValue(of(vm));

        const values = collect(service.openItems('p1'));

        expect(pets.getPetOpenItems).toHaveBeenCalledOnceWith('p1');
        expect(values).toEqual([{ state: 'loading' }, { state: 'ok', data: vm }]);
    });

    it('Pets.Read yoksa açık işler istenmez; istek hatası akışı kırmaz, error durumu olur', () => {
        claims.clear();
        expect(collect(service.openItems('p1'))).toEqual([null]);
        expect(pets.getPetOpenItems).not.toHaveBeenCalled();

        claims.add('Pets.Read');
        pets.getPetOpenItems.and.returnValue(throwError(() => new Error('x')));
        expect(collect(service.openItems('p1'))).toEqual([{ state: 'loading' }, { state: 'error' }]);
    });

    it('müşteri bakiyesi Charges.Read yoksa istenmez', () => {
        expect(collect(service.ownerBalance('c1'))).toEqual([null]);
        expect(clients.getClientBalance).not.toHaveBeenCalled();
    });

    it('sahibi olmayan hayvanda bakiye ve muayenesiz hayvanda muayene detayı istenmez', () => {
        claims.add('Charges.Read');
        claims.add('Examinations.Read');
        expect(collect(service.ownerBalance(null))).toEqual([null]);
        expect(collect(service.examination(null))).toEqual([null]);
    });

    it('müşteri kartı: hayvanlar (vefat edenler dahil, durum süzgeçsiz) müşteriye süzülür', () => {
        claims.add('Pets.Read');
        pets.getPets.and.returnValue(of({ items: [{ id: 'p1', clientId: 'c1' }, { id: 'p9', clientId: 'c9' }] }) as never);
        const petValues = collect(service.clientPets('c1'));
        expect(pets.getPets).toHaveBeenCalledWith(jasmine.objectContaining({ clientId: 'c1' }));
        expect(pets.getPets.calls.mostRecent().args[0].status).toBeUndefined();
        const lastPets = petValues[1];
        expect(lastPets?.state === 'ok' ? lastPets.data.map((p) => p.id) : null).toEqual(['p1']);
    });

    it('müşteri kartı: ücret bekleyenler müşteri süzgeciyle tek istekte okunur; izin yoksa istek atılmaz', () => {
        expect(collect(service.clientPendingCharges('c1'))).toEqual([null]);
        expect(chargeSuggestions.getPending).not.toHaveBeenCalled();

        claims.add('Charges.Read');
        const page = { items: [{ id: 's1', petId: 'p1' }], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 };
        chargeSuggestions.getPending.and.returnValue(of(page) as never);
        const values = collect(service.clientPendingCharges('c1'));
        expect(chargeSuggestions.getPending).toHaveBeenCalledOnceWith({ page: 1, pageSize: 200, clientId: 'c1' });
        expect(values[1]).toEqual({ state: 'ok', data: page } as never);
    });
});
