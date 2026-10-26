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
    const clients = {
        getClientBalance: vi.fn().mockName('ClientsService.getClientBalance')
    };
    const chargeSuggestions = {
        getPending: vi.fn().mockName('ChargeSuggestionsService.getPending')
    };
    const pets = {
        getPets: vi.fn().mockName('PetsService.getPets'),
        getPetOpenItems: vi.fn().mockName('PetsService.getPetOpenItems')
    };
    const treatments = {
        getTreatments: vi.fn().mockName('TreatmentsService.getTreatments')
    };

    const collect = <T>(source: { subscribe(fn: (v: PetCardSection<T>) => void): unknown }) => {
        const values: PetCardSection<T>[] = [];

        source.subscribe((v) => values.push(v));

        return values;
    };

    beforeEach(() => {
        claims = new Set(['Pets.Read']);
        pets.getPetOpenItems.mockClear();
        clients.getClientBalance.mockClear();
        chargeSuggestions.getPending.mockClear();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: ClientsService, useValue: clients },
                { provide: ChargeSuggestionsService, useValue: chargeSuggestions },
                { provide: ExaminationsService, useValue: {} },
                { provide: TreatmentsService, useValue: treatments },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(PetCardDataService);
    });

    it('hasta Yapılacaklar tek istekte açık işler ucundan okunur; önce yükleniyor, sonra veri yayar', () => {
        const vm = { petId: 'p1' } as PetOpenItemsVm;

        pets.getPetOpenItems.mockReturnValue(of(vm));

        const values = collect(service.openItems('p1'));

        expect(pets.getPetOpenItems).toHaveBeenCalledTimes(1);

        expect(pets.getPetOpenItems).toHaveBeenCalledWith('p1');
        expect(values).toEqual([{ state: 'loading' }, { state: 'ok', data: vm }]);
    });

    it('Pets.Read yoksa açık işler istenmez; istek hatası akışı kırmaz, error durumu olur', () => {
        claims.clear();
        expect(collect(service.openItems('p1'))).toEqual([null]);
        expect(pets.getPetOpenItems).not.toHaveBeenCalled();

        claims.add('Pets.Read');
        pets.getPetOpenItems.mockReturnValue(throwError(() => new Error('x')));
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
        pets.getPets.mockReturnValue(
            of({
                items: [
                    { id: 'p1', clientId: 'c1' },
                    { id: 'p9', clientId: 'c9' }
                ]
            }) as never
        );
        const petValues = collect(service.clientPets('c1'));

        expect(pets.getPets).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'c1' }));
        expect(vi.mocked(pets.getPets).mock.lastCall![0].status).toBeUndefined();
        const lastPets = petValues[1];

        expect(lastPets?.state === 'ok' ? lastPets.data.map((p) => p.id) : null).toEqual(['p1']);
    });

    it('müşteri kartı: ücret bekleyenler müşteri süzgeciyle tek istekte okunur; izin yoksa istek atılmaz', () => {
        expect(collect(service.clientPendingCharges('c1'))).toEqual([null]);
        expect(chargeSuggestions.getPending).not.toHaveBeenCalled();

        claims.add('Charges.Read');
        const page = { items: [{ id: 's1', petId: 'p1' }], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 };

        chargeSuggestions.getPending.mockReturnValue(of(page) as never);
        const values = collect(service.clientPendingCharges('c1'));

        expect(chargeSuggestions.getPending).toHaveBeenCalledTimes(1);

        expect(chargeSuggestions.getPending).toHaveBeenCalledWith({ page: 1, pageSize: 200, clientId: 'c1' });
        expect(values[1]).toEqual({ state: 'ok', data: page } as never);
    });

    it('hasta kartı aktif tedavileri sunucu süzgeciyle (active=true) ister; aktiflik istemcide yeniden hesaplanmaz', () => {
        claims.add('Treatments.Read');
        const items = [
            { id: 't1', petId: 'p1', followUpDateUtc: '2026-10-20T00:00:00Z' },
            { id: 't9', petId: 'p9', followUpDateUtc: '2026-10-21T00:00:00Z' }
        ];

        treatments.getTreatments.mockReturnValue(of({ items, page: 1, pageSize: 50, totalItems: 2, totalPages: 1 }) as never);
        const values = collect(service.followUpTreatments('p1'));

        expect(treatments.getTreatments).toHaveBeenCalledWith(expect.objectContaining({ petId: 'p1', active: true }));
        const last = values[1];

        expect(last?.state === 'ok' ? last.data.map((t) => t.id) : null).toEqual(['t1']);
    });
});
