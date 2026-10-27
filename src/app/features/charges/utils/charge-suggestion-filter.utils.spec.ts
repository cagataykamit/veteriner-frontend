import type { ChargeSuggestionVm } from '@/app/entities/charge/models/charge-suggestion-vm.model';
import { filterChargeSuggestions } from './charge-suggestion-filter.utils';

const item = (id: string, clientId: string, occurredAtUtc: string): ChargeSuggestionVm => ({
    id,
    sourceType: 'Administration',
    sourceId: `a-${id}`,
    clientId,
    clientName: 'Müşteri',
    petId: 'p1',
    petName: 'Pamuk',
    examinationId: null,
    visitId: null,
    description: 'Serum',
    quantity: 1,
    unit: 'Adet',
    suggestedUnitPrice: 100,
    currency: 'TRY',
    occurredAtUtc
});

describe('filterChargeSuggestions', () => {
    // 14 Ekim 2026 12:00 İstanbul (UTC+3)
    const now = new Date('2026-10-14T09:00:00Z');
    const items = [
        item('bugun', 'c1', '2026-10-14T06:00:00Z'),
        item('dun', 'c2', '2026-10-13T10:00:00Z'),
        item('alti-gun', 'c1', '2026-10-08T10:00:00Z'),
        item('yedi-gun', 'c1', '2026-10-07T10:00:00Z')
    ];
    const ids = (r: ChargeSuggestionVm[]) => r.map((i) => i.id);

    it('süzgeç yokken hepsi döner', () => {
        expect(ids(filterChargeSuggestions(items, { clientId: null, period: 'all' }, now))).toEqual(['bugun', 'dun', 'alti-gun', 'yedi-gun']);
    });

    it('müşteri süzgeci kimliğe göre', () => {
        expect(ids(filterChargeSuggestions(items, { clientId: 'c2', period: 'all' }, now))).toEqual(['dun']);
    });

    it('bugün: yalnız Türkiye takvim gününe düşenler', () => {
        expect(ids(filterChargeSuggestions(items, { clientId: null, period: 'today' }, now))).toEqual(['bugun']);
    });

    it('son 7 gün: bugün dahil 7 takvim günü', () => {
        expect(ids(filterChargeSuggestions(items, { clientId: null, period: 'week' }, now))).toEqual(['bugun', 'dun', 'alti-gun']);
    });

    it('gece yarısına yakın UTC anı Türkiye gününe göre değerlendirilir', () => {
        // 13 Ekim 21:30 UTC = 14 Ekim 00:30 İstanbul
        expect(ids(filterChargeSuggestions([item('gece', 'c1', '2026-10-13T21:30:00Z')], { clientId: null, period: 'today' }, now))).toEqual(['gece']);
    });

    it('müşteri ve tarih birlikte uygulanır', () => {
        expect(ids(filterChargeSuggestions(items, { clientId: 'c1', period: 'week' }, now))).toEqual(['bugun', 'alti-gun']);
    });
});
