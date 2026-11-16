import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { appointmentBubble, readVaccineLayerPreference, vaccinationBubble, vaccineChipClass, vaccinesOn, writeVaccineLayerPreference } from './calendar-layer.utils';

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
    ...extra
});

describe('calendar-layer.utils', () => {
    it('renkler: bugün sarı, ileri tarih siyah (gri değil), gecikmiş kırmızı, uygulandı yeşil', () => {
        expect(vaccineChipClass('DueToday')).toContain('bg-yellow');
        expect(vaccineChipClass('Upcoming')).toContain('border-surface-900');
        expect(vaccineChipClass('Upcoming')).not.toMatch(/gray|surface-400|surface-500/);
        expect(vaccineChipClass('Overdue')).toContain('red');
        expect(vaccineChipClass('Applied')).toContain('green');
    });

    it('günün aşıları: yalnız o gün; gecikmiş, bugün, ileri, uygulandı sırasıyla', () => {
        const items = [v('a', 'Applied'), v('b', 'Upcoming'), v('c', 'Overdue'), v('d', 'DueToday'), v('e', 'DueToday', 'x', { dateKey: '2026-11-17' })];

        expect(vaccinesOn('2026-11-16', items).map((i) => i.vaccinationId)).toEqual(['c', 'd', 'b', 'a']);
    });

    it('aşı balonu: tür ve aşı, müşteri – hasta, klinik – hekim atanmamış, durum', () => {
        const b = vaccinationBubble(v('a', 'Overdue', 'Pamuk', { notes: 'İç parazit ile birlikte' }), 'Merkez');

        expect(b).toEqual(
            expect.objectContaining({
                time: 'Gün içinde',
                title: 'Sonraki aşı: Karma',
                subject: 'Ayşe Yılmaz – Pamuk',
                place: 'Merkez – hekim atanmamış',
                notes: 'İç parazit ile birlikte',
                status: 'Gecikmiş, yapılmadı'
            })
        );
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

    it('katman tercihi varsayılan açık; kapatma hatırlanır', () => {
        localStorage.removeItem('vetinity.calendar.vaccineLayer');
        expect(readVaccineLayerPreference()).toBe(true);
        writeVaccineLayerPreference(false);
        expect(readVaccineLayerPreference()).toBe(false);
        writeVaccineLayerPreference(true);
        expect(readVaccineLayerPreference()).toBe(true);
    });
});
