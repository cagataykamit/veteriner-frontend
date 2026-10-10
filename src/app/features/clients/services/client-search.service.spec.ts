import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';

const client = (id: string, fullName: string, phone = '905321234567') => ({ id, fullName, phone, email: '', createdAtUtc: null });
const pet = (id: string, name: string, clientId: string | null) => ({ id, name, clientId, speciesId: null, speciesName: 'Kedi', breed: '', colorName: '', weight: '' });
const paged = <T>(items: T[]) => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 });

describe('ClientSearchService', () => {
    let service: ClientSearchService;
    let clients: jasmine.SpyObj<ClientsService>;
    let pets: jasmine.SpyObj<PetsService>;

    beforeEach(() => {
        clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClients', 'getClientById']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets']);
        TestBed.configureTestingModule({
            providers: [
                { provide: ClientsService, useValue: clients },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(ClientSearchService);
    });

    it('terimi kırpıp müşteri ve hayvan aramasına sunucu tarafı search olarak gönderir', (done) => {
        clients.getClients.and.returnValue(paged([]));
        pets.getPets.and.returnValue(paged([]));
        service.search('  ayşe ').subscribe((r) => {
            expect(r).toEqual([]);
            expect(clients.getClients.calls.first().args[0]).toEqual(jasmine.objectContaining({ search: 'ayşe', page: 1 }));
            expect(pets.getPets.calls.first().args[0]).toEqual(jasmine.objectContaining({ search: 'ayşe' }));
            done();
        });
    });

    it('sonuçta ad, biçimli telefon ve hayvan adları bulunur (aynı isimli müşteriler ayırt edilir)', (done) => {
        clients.getClients.and.returnValue(paged([client('c1', 'Ali Veli'), client('c2', 'Ali Veli', '905551112233')]));
        pets.getPets.and.callFake(((q: { clientId?: string; search?: string }) =>
            q.clientId === 'c1' ? paged([pet('p1', 'Pamuk', 'c1'), pet('p2', 'Boncuk', 'c1')]) : q.clientId === 'c2' ? paged([pet('p3', 'Karabaş', 'c2')]) : paged([])) as never);
        service.search('ali').subscribe((r) => {
            expect(r.map((x) => x.id)).toEqual(['c1', 'c2']);
            expect(r[0].petNames).toEqual(['Pamuk', 'Boncuk']);
            expect(r[1].petNames).toEqual(['Karabaş']);
            expect(r[0].phone).toContain('532');
            expect(r[0].label).toContain('Ali Veli');
            done();
        });
    });

    it('yalnız hayvan/mikroçip eşleşmesi: sahibi müşteri sonucuna eklenir', (done) => {
        clients.getClients.and.returnValue(paged([]));
        clients.getClientById.and.returnValue(of({ ...client('c9', 'Veli Can'), address: '', updatedAtUtc: null }));
        pets.getPets.and.callFake(((q: { clientId?: string }) => (q.clientId ? paged([pet('p9', 'Pamuk', 'c9')]) : paged([pet('p9', 'Pamuk', 'c9')]))) as never);
        service.search('985121').subscribe((r) => {
            expect(r.map((x) => x.id)).toEqual(['c9']);
            expect(r[0].petNames).toEqual(['Pamuk']);
            expect(clients.getClientById).toHaveBeenCalledOnceWith('c9');
            done();
        });
    });

    it('hayvan araması başarısız olsa da (ör. yetki yok) müşteri sonuçları döner', (done) => {
        clients.getClients.and.returnValue(paged([client('c1', 'Ali Veli')]));
        pets.getPets.and.returnValue(throwError(() => new Error('403')));
        service.search('ali').subscribe((r) => {
            expect(r.length).toBe(1);
            expect(r[0].petNames).toEqual([]);
            done();
        });
    });

    it('müşteri araması başarısızsa hata iletilir', (done) => {
        clients.getClients.and.returnValue(throwError(() => new Error('Müşteri listesi yüklenemedi.')));
        pets.getPets.and.returnValue(paged([]));
        service.search('ali').subscribe({
            error: (e: Error) => {
                expect(e.message).toBe('Müşteri listesi yüklenemedi.');
                done();
            }
        });
    });

    it('sonuç sayısını 10 ile sınırlar', (done) => {
        clients.getClients.and.returnValue(paged(Array.from({ length: 10 }, (_, i) => client(`c${i}`, `M${i}`))));
        pets.getPets.and.callFake(((q: { clientId?: string }) => (q.clientId ? paged([]) : paged([pet('px', 'X', 'extra')]))) as never);
        clients.getClientById.and.returnValue(of({ ...client('extra', 'Ekstra'), address: '', updatedAtUtc: null }));
        service.search('m').subscribe((r) => {
            expect(r.length).toBe(10);
            expect(r.some((x) => x.id === 'extra')).toBeFalse();
            done();
        });
    });

    it('getById seçili müşteri için etiket üretir', (done) => {
        clients.getClientById.and.returnValue(of({ ...client('c1', 'Ali Veli'), address: '', updatedAtUtc: null }));
        service.getById('c1').subscribe((r) => {
            expect(r.id).toBe('c1');
            expect(r.label).toContain('Ali Veli');
            done();
        });
    });
});
