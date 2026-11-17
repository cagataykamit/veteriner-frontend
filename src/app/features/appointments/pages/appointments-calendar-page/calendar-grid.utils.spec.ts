import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { conflictIds, durationText, firstFreeVeterinarian, firstScrollMinute, freeGaps, gridBounds, intersectGaps, isOpenAt, layoutBlocks, monthGridWeeks, rowStepMinutes, weekDateKeys, workingDayFor } from './calendar-grid.utils';

/** İstanbul 16.11.2026 (pazartesi) hh:mm başlangıçlı randevu (UTC+3). */
const item = (id: string, hm: string, duration: number, extra: Partial<AppointmentCalendarItemVm> = {}): AppointmentCalendarItemVm => {
    const [h, m] = hm.split(':').map(Number);
    const utc = new Date(Date.UTC(2026, 10, 16, h - 3, m)).toISOString();

    return {
        id,
        clinicId: 'c1',
        petId: `pet-${id}`,
        clientId: null,
        scheduledAtUtc: utc,
        scheduledEndUtc: null,
        durationMinutes: duration,
        durationLabel: '',
        localDateLabel: '',
        timeLabel: hm,
        timeRangeLabel: hm,
        status: 0,
        statusLabel: 'Planlandı',
        statusSeverity: 'info',
        appointmentTypeLabel: 'Muayene',
        petName: id,
        clientName: '',
        veterinarianUserId: null,
        veterinarianName: '',
        reasonName: null,
        notes: null,
        ...extra
    };
};

const hours = (dayOfWeek: number, open: string | null, close: string | null, breakStart: string | null = null, breakEnd: string | null = null): ClinicWorkingHourVm => ({
    dayOfWeek,
    dayLabel: '',
    isClosed: open === null,
    opensAt: open,
    closesAt: close,
    breakStartsAt: breakStart,
    breakEndsAt: breakEnd
});

describe('calendar-grid.utils', () => {
    it('aynı hekimde ya da aynı hastada üst üste binen randevular çakışır; farklı hekim ve iptal çakışmaz', () => {
        const ids = conflictIds([
            item('a', '14:00', 30, { veterinarianUserId: 'v1' }),
            item('b', '14:15', 30, { veterinarianUserId: 'v1' }),
            item('c', '14:00', 30, { veterinarianUserId: 'v2' }),
            item('d', '14:00', 30, { veterinarianUserId: 'v2', status: 2 }),
            item('e', '16:00', 30, { petId: 'p' }),
            item('f', '16:10', 20, { petId: 'p' })
        ]);

        expect([...ids].sort()).toEqual(['a', 'b', 'e', 'f']);
    });

    it('üst üste binenler yan yana şeritlere dağılır, ayrık olanlar tek şeritte kalır', () => {
        const blocks = layoutBlocks([item('a', '09:00', 60), item('b', '09:30', 30), item('c', '11:00', 30)]);
        const by = (id: string) => blocks.find((b) => b.item.id === id)!;

        expect([by('a').lane, by('a').lanes]).toEqual([0, 2]);
        expect([by('b').lane, by('b').lanes]).toEqual([1, 2]);
        expect([by('c').lane, by('c').lanes, by('c').start, by('c').end]).toEqual([0, 1, 660, 690]);
        expect(by('c').dateKey).toBe('2026-11-16');
    });

    it('çalışma günü, mola ve kapalı gün', () => {
        const week = [hours(1, '09:00', '19:00', '12:30', '13:30'), hours(0, null, null)];
        const monday = workingDayFor(week, '2026-11-16');

        expect(monday).toEqual({ open: 540, close: 1140, breakStart: 750, breakEnd: 810 });
        expect(isOpenAt(monday, 540)).toBe(true);
        expect(isOpenAt(monday, 780)).toBe(false);
        expect(isOpenAt(monday, 1140)).toBe(false);
        expect(workingDayFor(week, '2026-11-22')).toBeNull();
    });

    it('boş aralıklar mola ve randevuları atlar; iptal boş sayılır', () => {
        const day = { open: 540, close: 720, breakStart: null, breakEnd: null };
        const gaps = freeGaps(day, [item('a', '09:30', 30), item('b', '10:30', 30, { status: 2 })], 30);

        expect(gaps).toEqual([
            { start: 540, end: 570 },
            { start: 600, end: 720 }
        ]);
    });

    it('ızgara saatleri gösterilen günlerin açılış ve kapanışından, dışarıdaki randevuyu da kapsar', () => {
        const days = [{ open: 540, close: 1110, breakStart: null, breakEnd: null }, { open: 600, close: 840, breakStart: null, breakEnd: null }, null];

        expect(gridBounds(days, [])).toEqual({ start: 540, end: 1140 });
        expect(gridBounds(days, layoutBlocks([item('a', '07:30', 30)]))).toEqual({ start: 420, end: 1140 });
    });

    it('çalışma saati girilmemişse ilk kaydın saatinden, kayıt da yoksa 08:00\'den başlar (gece 01:00 boş saatleri yok)', () => {
        expect(gridBounds([null, null], layoutBlocks([item('a', '10:15', 30), item('b', '14:00', 30)]))).toEqual({ start: 600, end: 1200 });
        expect(gridBounds([null], [])).toEqual({ start: 480, end: 1200 });
        expect(gridBounds([null], layoutBlocks([item('c', '21:10', 30)]))).toEqual({ start: 1260, end: 1320 });
    });

    it('ilk ekran: ilk kayda, kayıt yoksa seçili günün açılışına kaydırılır', () => {
        const day = { open: 540, close: 1080, breakStart: null, breakEnd: null };

        expect(firstScrollMinute(layoutBlocks([item('a', '14:00', 30), item('b', '11:00', 30)]), day)).toBe(660);
        expect(firstScrollMinute([], day)).toBe(540);
        expect(firstScrollMinute([], null)).toBeNull();
    });

    it('satır adımı slot aralığının 15 dakikadan küçük olmayan katı; hafta pazartesiden başlar', () => {
        expect([5, 10, 15, 30, 60].map(rowStepMinutes)).toEqual([15, 20, 15, 30, 60]);
        expect(weekDateKeys('2026-11-22')[0]).toBe('2026-11-16');
        expect(weekDateKeys('2026-11-16')[6]).toBe('2026-11-22');
    });
});

describe('calendar-grid.utils — boş hekim ve ortak boşluk', () => {
    it('ortak boş aralıklar kesişimdir', () => {
        expect(
            intersectGaps(
                [
                    [{ start: 540, end: 720 }],
                    [
                        { start: 600, end: 660 },
                        { start: 690, end: 780 }
                    ]
                ],
                30
            )
        ).toEqual([
            { start: 600, end: 660 },
            { start: 690, end: 720 }
        ]);
        expect(intersectGaps([], 30)).toEqual([]);
    });

    it('o saatte boş ilk hekim; iptal meşgul saymaz; herkes doluysa null', () => {
        const items = [item('a', '14:00', 30, { veterinarianUserId: 'v1' }), item('b', '14:00', 30, { veterinarianUserId: 'v2', status: 2 })];

        expect(firstFreeVeterinarian(['v1', 'v2'], items, '2026-11-16', 840, 30)).toBe('v2');
        expect(firstFreeVeterinarian(['v1'], items, '2026-11-16', 840, 30)).toBeNull();
        expect(firstFreeVeterinarian(['v1'], items, '2026-11-16', 870, 30)).toBe('v1');
        expect(durationText(150)).toBe('2 sa 30 dk');
    });
});

describe('monthGridWeeks', () => {
    it('Kasım 2026: pazartesi 26 Ekim ile başlar, 6 Aralık ile biter (6 hafta)', () => {
        const weeks = monthGridWeeks('2026-11-16');

        expect(weeks.length).toBe(6);
        expect(weeks[0][0]).toBe('2026-10-26');
        expect(weeks[5][6]).toBe('2026-12-06');
    });

    it('Şubat 2027: 4 ya da 5 hafta, ay dışına taşan hafta eklenmez', () => {
        const weeks = monthGridWeeks('2027-02-10');

        expect(weeks[0][0]).toBe('2027-02-01');
        expect(weeks.at(-1)![6]).toBe('2027-02-28');
        expect(weeks.length).toBe(4);
    });
});
