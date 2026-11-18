import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { convertToParamMap } from '@angular/router';
import {
    appointmentBubble,
    calendarFiltersToQueryParams,
    calendarRequestFor,
    parseCalendarFilters,
    readStoredCalendarFilters,
    vaccinationBubble,
    vaccineChipClass,
    vaccinesOn,
    writeStoredCalendarFilters,
    waitingLabel
} from './calendar-layer.utils';

const v = (id: string, state: VaccinationCalendarItemVm['state'], petName = id, extra: Partial<VaccinationCalendarItemVm> = {}): VaccinationCalendarItemVm => ({
    key: `${id}:NextDue`,
    vaccinationId: id,
    kind: 'NextDue',
    state,
    dateKey: '2026-11-16',
    atUtc: '2026-11-16T09:00:00Z',
    petId: 'p',
    petName,
    clientId: 'c',
    clientName: 'Ayşe Yılmaz',
    vaccineDefinitionId: null,
    vaccineName: 'Karma',
    notes: null,
    timeSpecified: false,
    ...extra
});

describe('calendar-layer.utils', () => {
    it('renkler: bugün sarı, ileri tarih siyah (gri değil), gecikmiş kırmızı, uygulandı yeşil', () => {
        expect(vaccineChipClass('DueToday')).toContain('bg-yellow');
        expect(vaccineChipClass('Upcoming')).toContain('border-surface-900');
        expect(vaccineChipClass('Upcoming')).not.toMatch(/gray|surface-400|surface-500/);
        expect(vaccineChipClass('Overdue')).toContain('red');
        expect(vaccineChipClass('Completed')).toContain('green');
    });

    it('günün aşıları: yalnız o gün; gecikmiş, bugün, ileri, uygulandı sırasıyla', () => {
        const items = [v('a', 'Completed'), v('b', 'Upcoming'), v('c', 'Overdue'), v('d', 'DueToday'), v('e', 'DueToday', 'x', { dateKey: '2026-11-17' })];

        expect(vaccinesOn('2026-11-16', items).map((i) => i.vaccinationId)).toEqual(['c', 'd', 'b', 'a']);
    });

    it('aşı balonu: tür ve aşı, müşteri – hasta, klinik – hekim atanmamış, durum', () => {
        const b = vaccinationBubble(v('a', 'Overdue', 'Pamuk', { notes: 'İç parazit ile birlikte' }), 'Merkez');

        expect(b).toEqual(
            expect.objectContaining({
                time: 'Saatsiz (gün içinde)',
                title: 'Sonraki aşı: Karma',
                subject: 'Ayşe Yılmaz – Pamuk',
                place: 'Merkez – hekim atanmamış',
                notes: 'İç parazit ile birlikte',
                status: 'Gecikmiş, yapılmadı'
            })
        );
    });

    it('aşı balonu: saati gerçekse saat yazılır', () => {
        expect(vaccinationBubble(v('a', 'DueToday', 'Pamuk', { timeSpecified: true }), 'Merkez').time).toBe('12:00');
    });

    it('bekleme süresi: dakika, 60 dk üstü saat ve dakika, 24 saat üstü gün', () => {
        const now = Date.parse('2026-11-18T12:00:00Z');

        expect(waitingLabel('2026-11-18T11:52:00Z', now)).toBe('Bekliyor 8 dk');
        expect(waitingLabel('2026-11-18T08:48:00Z', now, ' · ')).toBe('Bekliyor · 3 sa 12 dk');
        expect(waitingLabel('2026-11-18T10:00:00Z', now)).toBe('Bekliyor 2 sa');
        expect(waitingLabel('2026-11-09T02:00:00Z', now)).toBe('9 gündür bekliyor');
    });

    it('randevu balonu: saat aralığı, tür (neden), müşteri – hasta, klinik – hekim, not ve durum', () => {
        const item = {
            timeRangeLabel: '10:00–10:30',
            appointmentTypeLabel: 'Aşılama',
            reasonName: 'İç + dış parazit',
            clientName: 'Ali Veli',
            petName: 'Pamuk',
            veterinarianUserId: 'v1',
            veterinarianName: 'Dr. Ayşe',
            notes: 'Aç gelsin',
            status: 0,
            statusLabel: 'Planlandı'
        } as AppointmentCalendarItemVm;

        expect(appointmentBubble(item, 'Merkez')).toEqual(
            expect.objectContaining({
                time: '10:00–10:30',
                title: 'Aşılama (İç + dış parazit)',
                subject: 'Ali Veli – Pamuk',
                place: 'Merkez – Dr. Ayşe',
                notes: 'Aç gelsin',
                status: 'Planlandı'
            })
        );
        expect(appointmentBubble({ ...item, reasonName: null, veterinarianUserId: null, veterinarianName: '—' }, 'Merkez')).toEqual(
            expect.objectContaining({ title: 'Aşılama', place: 'Merkez – Hekim seçilmedi' })
        );
    });

    it('filtreler adres çubuğundan okunur ve yazılır; bilinmeyen değerler atlanır, boş filtre parametre yazmaz', () => {
        const f = parseCalendarFilters(convertToParamMap({ vet: 'none', types: 'asi,1,x', states: 'Completed,Bad,DueToday' }));

        expect(f).toEqual({ vet: 'none', types: ['asi', '1'], states: ['DueToday', 'Completed'] });
        expect(calendarFiltersToQueryParams(f)).toEqual({ vet: 'none', types: 'asi,1', states: 'DueToday,Completed' });
        expect(calendarFiltersToQueryParams({ vet: null, types: [], states: [] })).toEqual({ vet: undefined, types: undefined, states: undefined });
    });

    it('sunucu isteği: tür boşsa randevu ve aşı tümü; yalnız aşı seçiliyse randevu yok; hekim seçiliyse aşı yok', () => {
        expect(calendarRequestFor({ vet: null, types: [], states: [] })).toEqual(
            expect.objectContaining({ appointments: true, appointmentTypes: [], vaccines: true, withoutVeterinarian: false })
        );
        expect(calendarRequestFor({ vet: null, types: ['asi'], states: [] })).toEqual(expect.objectContaining({ appointments: false, vaccines: true }));
        expect(calendarRequestFor({ vet: null, types: ['1', '2'], states: [] })).toEqual(expect.objectContaining({ appointments: true, appointmentTypes: [1, 2], vaccines: false }));
        expect(calendarRequestFor({ vet: 'v1', types: [], states: [] })).toEqual(expect.objectContaining({ veterinarianUserId: 'v1', vaccines: false }));
        expect(calendarRequestFor({ vet: 'none', types: [], states: [] })).toEqual(expect.objectContaining({ veterinarianUserId: undefined, withoutVeterinarian: true, vaccines: true }));
    });

    it('son seçim tarayıcıda hatırlanır', () => {
        writeStoredCalendarFilters({ vet: null, types: ['asi'], states: ['Overdue'] });
        expect(readStoredCalendarFilters()).toEqual({ vet: null, types: ['asi'], states: ['Overdue'] });
        writeStoredCalendarFilters({ vet: null, types: [], states: [] });
        expect(readStoredCalendarFilters()).toEqual({ vet: null, types: [], states: [] });
    });
});
