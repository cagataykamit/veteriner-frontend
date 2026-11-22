import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { compareClinicWeekDay, panelBookingHours } from './clinic-working-hours.mapper';

describe('panelBookingHours (çalışma saati kısıtı)', () => {
    const defined: ClinicWorkingHourVm[] = [{ dayOfWeek: 0, dayLabel: 'Pazar', isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null }];

    it('kısıt açıkken tanımlı saatler', () => {
        expect(panelBookingHours(defined, true)).toBe(defined);
    });

    it('kısıt kapalıyken her gün 00:00-23:59, mola ve kapalı gün yok', () => {
        const week = panelBookingHours(defined, false);

        expect(week.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(week.every((d) => !d.isClosed && d.opensAt === '00:00' && d.closesAt === '23:59' && d.breakStartsAt === null && d.breakEndsAt === null)).toBe(true);
    });
});

describe('compareClinicWeekDay', () => {
    it('hafta Pazartesi başlar, Pazar sondadır', () => {
        const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek }));

        expect([...days].sort(compareClinicWeekDay).map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    });
});
