import {
    appointmentStatusLabel,
    appointmentStatusSeverity,
    canMarkAppointmentNoShow,
    canRevertAppointmentNoShow,
    isAppointmentNoShowStatus,
    parseAppointmentStatusRawToEnum
} from '@/app/features/appointments/utils/appointment-status.utils';

describe('appointment status — Gelmedi (NoShow)', () => {
    it('3 ve NoShow dizgisi Gelmedi olarak çözülür; etiket ve rozet rengi tanımlı', () => {
        expect(parseAppointmentStatusRawToEnum(3)).toBe(3);
        expect(parseAppointmentStatusRawToEnum('NoShow')).toBe(3);
        expect(parseAppointmentStatusRawToEnum('4')).toBeNull();
        expect(appointmentStatusLabel(3)).toBe('Gelmedi');
        expect(appointmentStatusLabel('NoShow')).toBe('Gelmedi');
        expect(appointmentStatusSeverity(3)).toBe('warn');
    });

    it('isAppointmentNoShowStatus / canRevert yalnızca Gelmedi için', () => {
        expect(isAppointmentNoShowStatus(3)).toBeTrue();
        expect(isAppointmentNoShowStatus(0)).toBeFalse();
        expect(canRevertAppointmentNoShow(3)).toBeTrue();
        expect(canRevertAppointmentNoShow(2)).toBeFalse();
    });

    describe('canMarkAppointmentNoShow', () => {
        const now = new Date('2026-10-10T10:00:00Z');

        it('yalnızca saati geçmiş Planlandı randevuda', () => {
            expect(canMarkAppointmentNoShow(0, '2026-10-10T09:59:00Z', now)).toBeTrue();
            expect(canMarkAppointmentNoShow(0, '2026-10-10T10:00:00Z', now)).toBeTrue();
            expect(canMarkAppointmentNoShow(0, '2026-10-10T10:01:00Z', now)).toBeFalse();
        });

        it('Tamamlandı / İptal / Gelmedi veya geçersiz saatte yok', () => {
            for (const s of [1, 2, 3, null]) {
                expect(canMarkAppointmentNoShow(s, '2026-10-10T09:00:00Z', now)).toBeFalse();
            }
            expect(canMarkAppointmentNoShow(0, null, now)).toBeFalse();
            expect(canMarkAppointmentNoShow(0, 'geçersiz', now)).toBeFalse();
        });
    });
});
