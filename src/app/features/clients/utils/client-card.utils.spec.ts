import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import type { ChargeSuggestionVm } from '@/app/entities/charge/models/charge-suggestion-vm.model';
import type { ClientBalanceVm, ClientOpenChargeVm } from '@/app/entities/client/models/client-balance-vm.model';
import type { PetListItemVm } from '@/app/entities/pet/models/pet-vm.model';
import { buildClientPetRows, buildClientTodo, type ClientTodoContext, type ClientTodoSources, pendingChargesSummary, soleActivePet } from './client-card.utils';

const NOW = new Date('2026-10-14T09:00:00Z');

const charge = (id: string, petId: string, petName: string, description = 'Serum'): ChargeSuggestionVm => ({ id, petId, petName, clientId: 'c1', description }) as ChargeSuggestionVm;

const openCharge = (petId: string | null, petName: string | null, outstandingAmount: number): ClientOpenChargeVm => ({ chargeId: `ch-${petId}-${outstandingAmount}`, petId, petName, outstandingAmount }) as ClientOpenChargeVm;

const balance = (openCharges: ClientOpenChargeVm[]): ClientBalanceVm => ({
    clientId: 'c1',
    clientName: 'Ali Veli',
    currency: 'TRY',
    chargedAmount: 0,
    allocatedAmount: 0,
    outstandingAmount: openCharges.reduce((s, c) => s + c.outstandingAmount, 0),
    openCharges
});

const pet = (id: string, name: string): PetListItemVm => ({
    id,
    clientId: 'c1',
    speciesId: 's1',
    name,
    speciesName: 'Kedi',
    breed: 'Tekir',
    colorName: '—',
    weight: '—',
    status: 'Active'
});

const appointment = (id: string, petId: string, scheduledAtUtc: string, status = 0): AppointmentListItemVm => ({ id, petId, petName: '', scheduledAtUtc, status }) as AppointmentListItemVm;

const ctx = (claims: string[], over: Partial<ClientTodoContext> = {}): ClientTodoContext => ({
    clientId: 'c1',
    hasClaim: (c) => claims.includes(c),
    mutationBlocked: false,
    emphasis: 'clinical',
    ...over
});

describe('buildClientTodo', () => {
    const sources = (over: Partial<ClientTodoSources> = {}): ClientTodoSources => ({
        pendingCharges: { state: 'ok', data: [] },
        balance: { state: 'ok', data: balance([]) },
        ...over
    });

    it('ücret bekleyen işlemler hayvan başına tek satır, hayvan adıyla ve hayvana süzülmüş Ücretlendir eylemiyle gelir', () => {
        const view = buildClientTodo(sources({ pendingCharges: { state: 'ok', data: [charge('1', 'p1', 'Pamuk'), charge('2', 'p2', 'Karabaş', 'Kuduz aşısı'), charge('3', 'p1', 'Pamuk', 'Enjeksiyon')] } }), ctx(['Charges.Create']));

        expect(view.items.map((i) => i.title)).toEqual(['Pamuk: 2 işlem ücret bekliyor', 'Karabaş: 1 işlem ücret bekliyor']);
        expect(view.items[0].detail).toBe('Serum, Enjeksiyon');
        expect(view.items[0].action).toEqual({ label: 'Ücretlendir', route: ['/panel/charges/pending'], queryParams: { petId: 'p1' } });
        expect(buildClientTodo(sources({ pendingCharges: { state: 'ok', data: [charge('1', 'p1', 'Pamuk')] } }), ctx([])).items[0].action.label).toBe('Gör');
    });

    it('açık borç hayvan kırılımıyla yazılır (genel ücret "Genel"); ödeme izni yoksa veya salt okunursa ücret listesine gider', () => {
        const b = balance([openCharge('p1', 'Pamuk', 300), openCharge(null, null, 100), openCharge('p1', 'Pamuk', 200)]);
        const item = buildClientTodo(sources({ balance: { state: 'ok', data: b } }), ctx(['Payments.Create'])).items[0];

        expect(item.kind).toBe('openBalance');
        expect(item.title).toContain('600');
        expect(item.detail).toMatch(/^Pamuk .*500.* · Genel .*100/);
        expect(item.action).toEqual({ label: 'Ödeme al', route: ['/panel/payments/new'], queryParams: { clientId: 'c1' } });

        const fallback = { label: 'Ücretleri gör', route: ['/panel/charges'], queryParams: { clientId: 'c1' } };

        expect(buildClientTodo(sources({ balance: { state: 'ok', data: b } }), ctx([])).items[0].action).toEqual(fallback);
        expect(buildClientTodo(sources({ balance: { state: 'ok', data: b } }), ctx(['Payments.Create'], { mutationBlocked: true })).items[0].action).toEqual(fallback);
    });

    it('rol vurgusu hasta kartıyla aynı: klinik önce ücret bekleyen, resepsiyon önce borç', () => {
        const s = sources({ pendingCharges: { state: 'ok', data: [charge('1', 'p1', 'Pamuk')] }, balance: { state: 'ok', data: balance([openCharge('p1', 'Pamuk', 50)]) } });

        expect(buildClientTodo(s, ctx([])).items.map((i) => i.kind)).toEqual(['pendingCharge', 'openBalance']);
        expect(buildClientTodo(s, ctx([], { emphasis: 'frontDesk' })).items.map((i) => i.kind)).toEqual(['openBalance', 'pendingCharge']);
    });

    it('yükleniyor ve alınamadı ayrı raporlanır; yetkisiz (null) kaynak ikisine de girmez, hepsi yetkisizse forbidden', () => {
        const view = buildClientTodo({ pendingCharges: { state: 'loading' }, balance: { state: 'error' } }, ctx([]));

        expect(view).toEqual({ items: [], loading: true, failed: ['Bakiye'], forbidden: false });
        expect(buildClientTodo({ pendingCharges: null, balance: null }, ctx([]))).toEqual({ items: [], loading: false, failed: [], forbidden: true });
        expect(buildClientTodo({ pendingCharges: null, balance: { state: 'loading' } }, ctx([])).forbidden).toBe(false);
    });
});

describe('buildClientPetRows', () => {
    it('hayvana düşen borç, ücret bekleyen sayısı ve en yakın planlı randevu birleşir', () => {
        const rows = buildClientPetRows(
            [pet('p1', 'Pamuk'), pet('p2', 'Karabaş')],
            balance([openCharge('p1', 'Pamuk', 300)]),
            [charge('1', 'p2', 'Karabaş'), charge('2', 'p2', 'Karabaş')],
            [appointment('a1', 'p1', '2026-10-20T09:00:00Z'), appointment('a2', 'p1', '2026-10-16T09:00:00Z'), appointment('a3', 'p2', '2026-10-15T09:00:00Z', 2)],
            NOW
        );

        expect(rows.map((r) => [r.pet.id, r.outstandingAmount, r.pendingChargeCount, r.nextAppointment?.id ?? null])).toEqual([
            ['p1', 300, 0, 'a2'],
            ['p2', 0, 2, null]
        ]);
    });

    it('bakiye veya ücret bekleyen okunamıyorsa ilgili alan null kalır (sıfır sanılmaz)', () => {
        const [row] = buildClientPetRows([pet('p1', 'Pamuk')], null, null, [], NOW);

        expect(row.outstandingAmount).toBeNull();
        expect(row.pendingChargeCount).toBeNull();
    });
});

describe('pendingChargesSummary (müşteri bazlı ücret bekleyen, sözleşme §3)', () => {
    const priced = (id: string, quantity: number, suggestedUnitPrice: number | null) => ({ ...charge(id, 'p1', 'Pamuk'), quantity, suggestedUnitPrice, currency: 'TRY' });

    it('sayı totalItems; tutar quantity × önerilen fiyat (satır başına yuvarlama), fiyatsız kalem ayrı sayılır', () => {
        const s = pendingChargesSummary({ items: [priced('a', 2, 12.5), priced('b', 0.333, 10), priced('c', 1, null)], totalItems: 3 });

        expect(s).toEqual({ count: 3, amount: 28.33, currency: 'TRY', unpricedCount: 1, partial: false });
    });

    it('sayfa tüm kalemleri içermiyorsa kısmi işaretlenir', () => {
        expect(pendingChargesSummary({ items: [priced('a', 1, 10)], totalItems: 250 }).partial).toBe(true);
        expect(pendingChargesSummary({ items: [], totalItems: 0 })).toEqual({ count: 0, amount: 0, currency: 'TRY', unpricedCount: 0, partial: false });
    });
});

describe('soleActivePet', () => {
    it('tek aktif hayvan varsa onu döner; vefat edenler sayılmaz', () => {
        expect(soleActivePet([pet('p1', 'Pamuk'), { ...pet('p2', 'Karabaş'), status: 'Deceased' }])?.id).toBe('p1');
        expect(soleActivePet([pet('p1', 'Pamuk'), pet('p2', 'Karabaş')])).toBeNull();
        expect(soleActivePet([{ ...pet('p2', 'Karabaş'), status: 'Deceased' }])).toBeNull();
    });
});
