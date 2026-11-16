import { mapVaccinationCalendarItemsToVm } from './vaccination-calendar.mapper';

describe('vaccination-calendar.mapper', () => {
    it('sözleşme satırını eşler; satır anahtarı kayıt + tür (aynı kayıt iki satır verebilir)', () => {
        const items = mapVaccinationCalendarItemsToVm([
            { vaccinationId: 'v1', kind: 'Applied', state: 'Applied', date: '2026-11-16', atUtc: '2026-11-16T07:42:00Z', petName: 'Pamuk', clientName: 'Ayşe', vaccineName: 'Karma' },
            { vaccinationId: 'v1', kind: 'NextDue', state: 'Upcoming', date: '2026-11-20', atUtc: '2026-11-20T09:00:00Z', petName: 'Pamuk', clientName: 'Ayşe', vaccineName: 'Karma', notes: ' ' }
        ]);

        expect(items.map((i) => i.key)).toEqual(['v1:Applied', 'v1:NextDue']);
        expect(items[1]).toEqual(expect.objectContaining({ kind: 'NextDue', state: 'Upcoming', dateKey: '2026-11-20', notes: null, petName: 'Pamuk' }));
    });

    it('bilinmeyen tür/durum ya da tarihsiz satır atlanır', () => {
        expect(
            mapVaccinationCalendarItemsToVm([
                { vaccinationId: 'a', kind: 'Other', state: 'Applied', date: '2026-11-16' },
                { vaccinationId: 'b', kind: 'Planned', state: 'Late', date: '2026-11-16' },
                { vaccinationId: 'c', kind: 'Planned', state: 'Upcoming', date: null }
            ])
        ).toEqual([]);
    });
});
