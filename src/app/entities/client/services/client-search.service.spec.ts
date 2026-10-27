import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientSearchService } from '@/app/entities/client/services/client-search.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';

const client = (id: string, fullName: string, phone = '905321234567') => ({ id, fullName, phone, email: '', createdAtUtc: null });
const pet = (id: string, name: string, clientId: string | null) => ({ id, name, clientId, speciesId: null, speciesName: 'Kedi', breed: '', colorName: '', weight: '' });
const noKvkk = { kvkkConsent: { status: 'None' as const, recordedOn: null, recordedByName: null, templateVersion: null, templateHash: null }, invoicing: null, rowVersion: null };
const paged = <T>(items: T[]) => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 });

describe('ClientSearchService', () => {
    let service: ClientSearchService;
    let clients: MockedObject<ClientsService>;
    let pets: MockedObject<PetsService>;

    beforeEach(() => {
        clients = {
            getClients: vi.fn().mockName('ClientsService.getClients'),
            getClientById: vi.fn().mockName('ClientsService.getClientById')
        } as unknown as MockedObject<ClientsService>;
        pets = {
            getPets: vi.fn().mockName('PetsService.getPets')
        } as unknown as MockedObject<PetsService>;
        TestBed.configureTestingModule({
            providers: [
                { provide: ClientsService, useValue: clients },
                { provide: PetsService, useValue: pets }
            ]
        });
        service = TestBed.inject(ClientSearchService);
    });

    it('terimi kırpıp müşteri ve hayvan aramasına sunucu tarafı search olarak gönderir', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(paged([]));
            pets.getPets.mockReturnValue(paged([]));
            service.search('  ayşe ').subscribe((r) => {
                expect(r).toEqual([]);
                expect(vi.mocked(clients.getClients).mock.calls[0][0]).toEqual(expect.objectContaining({ search: 'ayşe', page: 1 }));
                expect(vi.mocked(pets.getPets).mock.calls[0][0]).toEqual(expect.objectContaining({ search: 'ayşe' }));
                done();
            });
        }));

    it('sonuçta ad, biçimli telefon ve hayvan adları bulunur (aynı isimli müşteriler ayırt edilir)', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(paged([client('c1', 'Ali Veli'), client('c2', 'Ali Veli', '905551112233')]));
            pets.getPets.mockImplementation(((q: { clientId?: string; search?: string }) =>
                q.clientId === 'c1' ? paged([pet('p1', 'Pamuk', 'c1'), pet('p2', 'Boncuk', 'c1')]) : q.clientId === 'c2' ? paged([pet('p3', 'Karabaş', 'c2')]) : paged([])) as never);
            service.search('ali').subscribe((r) => {
                expect(r.map((x) => x.id)).toEqual(['c1', 'c2']);
                expect(r[0].petNames).toEqual(['Pamuk', 'Boncuk']);
                expect(r[1].petNames).toEqual(['Karabaş']);
                expect(r[0].phone).toContain('532');
                expect(r[0].label).toContain('Ali Veli');
                done();
            });
        }));

    it('yalnız hayvan/mikroçip eşleşmesi: sahibi müşteri sonucuna eklenir', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(paged([]));
            clients.getClientById.mockReturnValue(of({ ...client('c9', 'Veli Can'), address: '', updatedAtUtc: null, preferredContactChannel: 'None', remindersOptedOut: false, ...noKvkk }));
            pets.getPets.mockImplementation(((q: { clientId?: string }) => (q.clientId ? paged([pet('p9', 'Pamuk', 'c9')]) : paged([pet('p9', 'Pamuk', 'c9')]))) as never);
            service.search('985121').subscribe((r) => {
                expect(r.map((x) => x.id)).toEqual(['c9']);
                expect(r[0].petNames).toEqual(['Pamuk']);
                expect(clients.getClientById).toHaveBeenCalledTimes(1);
                expect(clients.getClientById).toHaveBeenCalledWith('c9');
                done();
            });
        }));

    it('hayvan araması başarısız olsa da (ör. yetki yok) müşteri sonuçları döner', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(paged([client('c1', 'Ali Veli')]));
            pets.getPets.mockReturnValue(throwError(() => new Error('403')));
            service.search('ali').subscribe((r) => {
                expect(r.length).toBe(1);
                expect(r[0].petNames).toEqual([]);
                done();
            });
        }));

    it('müşteri araması başarısızsa hata iletilir', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(throwError(() => new Error('Müşteri listesi yüklenemedi.')));
            pets.getPets.mockReturnValue(paged([]));
            service.search('ali').subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe('Müşteri listesi yüklenemedi.');
                    done();
                }
            });
        }));

    it('sonuç sayısını 10 ile sınırlar', () =>
        new Promise<void>((done) => {
            clients.getClients.mockReturnValue(paged(Array.from({ length: 10 }, (_, i) => client(`c${i}`, `M${i}`))));
            pets.getPets.mockImplementation(((q: { clientId?: string }) => (q.clientId ? paged([]) : paged([pet('px', 'X', 'extra')]))) as never);
            clients.getClientById.mockReturnValue(of({ ...client('extra', 'Ekstra'), address: '', updatedAtUtc: null, preferredContactChannel: 'None', remindersOptedOut: false, ...noKvkk }));
            service.search('m').subscribe((r) => {
                expect(r.length).toBe(10);
                expect(r.some((x) => x.id === 'extra')).toBe(false);
                done();
            });
        }));

    it('getById seçili müşteri için etiket üretir', () =>
        new Promise<void>((done) => {
            clients.getClientById.mockReturnValue(of({ ...client('c1', 'Ali Veli'), address: '', updatedAtUtc: null, preferredContactChannel: 'None', remindersOptedOut: false, ...noKvkk }));
            service.getById('c1').subscribe((r) => {
                expect(r.id).toBe('c1');
                expect(r.label).toContain('Ali Veli');
                done();
            });
        }));
});
