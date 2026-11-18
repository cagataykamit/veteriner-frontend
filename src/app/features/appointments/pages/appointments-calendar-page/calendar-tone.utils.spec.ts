import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { appointmentTone, initials, stateTone, toneCardClass } from './calendar-tone.utils';

const item = (extra: Partial<AppointmentCalendarItemVm>) => ({ status: 0, state: 'Upcoming', ...extra }) as AppointmentCalendarItemVm;

describe('calendar-tone.utils', () => {
    it('durum = renk: gelecek koyu, bugün sarı, gecikmiş kırmızı zemin, tamamlanan yeşil, durumsuz (iptal/gelmedi) gri', () => {
        expect(stateTone('Upcoming')).toBe('up');
        expect(stateTone('DueToday')).toBe('today');
        expect(stateTone('Overdue')).toBe('overdue');
        expect(stateTone('Completed')).toBe('done');
        expect(stateTone(null)).toBe('off');
        expect(toneCardClass('overdue')).toContain('bg-red-50');
        expect(toneCardClass('today')).not.toContain('bg-amber');
    });

    it('kabul durumu planlı randevunun gün durumunun önüne geçer; tamamlanan ve iptal etkilenmez', () => {
        expect(appointmentTone(item({ state: 'DueToday' }), { kind: 'wait', since: null })).toBe('wait');
        expect(appointmentTone(item({ state: 'DueToday' }), { kind: 'room' })).toBe('room');
        expect(appointmentTone(item({ state: 'Completed' }), { kind: 'room' })).toBe('done');
        expect(appointmentTone(item({ state: null, status: 2 }), { kind: 'wait', since: null })).toBe('off');
    });

    it('hekim baş harfleri unvansız', () => {
        expect(initials('Dr. Ece Arslan')).toBe('EA');
        expect(initials('Murat')).toBe('M');
        expect(initials('')).toBe('–');
    });
});
