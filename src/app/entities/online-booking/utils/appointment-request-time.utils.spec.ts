import { appointmentRequestAgoLabel, appointmentRequestDayLabel, appointmentRequestDayOffset, isNewAppointmentRequest } from './appointment-request-time.utils';

/** 2026-11-03 Salı 15:00 (Europe/Istanbul, UTC+3). */
const NOW = new Date('2026-11-03T12:00:00Z');

describe('appointment-request-time.utils', () => {
    it('son 30 dk içinde gelen talep yenidir', () => {
        expect(isNewAppointmentRequest('2026-11-03T11:31:00Z', NOW)).toBe(true);
        expect(isNewAppointmentRequest('2026-11-03T11:30:00Z', NOW)).toBe(false);
        expect(isNewAppointmentRequest('bozuk', NOW)).toBe(false);
    });

    it('gün etiketi İstanbul takvimine göre: Bugün, Yarın, sonra kısa gün adı', () => {
        expect(appointmentRequestDayLabel('2026-11-03T20:30:00Z', NOW)).toBe('Bugün'); // 23:30 yerel
        expect(appointmentRequestDayLabel('2026-11-03T21:30:00Z', NOW)).toBe('Yarın'); // 00:30 yerel, ertesi gün
        expect(appointmentRequestDayLabel('2026-11-05T07:00:00Z', NOW)).toBe('5 Kas Per');
        expect(appointmentRequestDayOffset('2026-11-02T08:00:00Z', NOW)).toBe(-1);
    });

    it('ne zaman geldiği: az önce, dakika, saat, dün, gün', () => {
        expect(appointmentRequestAgoLabel('2026-11-03T11:59:40Z', NOW)).toBe('az önce');
        expect(appointmentRequestAgoLabel('2026-11-03T11:48:00Z', NOW)).toBe('12 dk önce');
        expect(appointmentRequestAgoLabel('2026-11-03T09:30:00Z', NOW)).toBe('2 sa önce');
        expect(appointmentRequestAgoLabel('2026-11-02T18:00:00Z', NOW)).toBe('dün');
        expect(appointmentRequestAgoLabel('2026-10-31T12:00:00Z', NOW)).toBe('3 gün önce');
    });
});
