import {
    appointmentStatusLabel,
    appointmentStatusSeverity,
    canCancelAppointment,
    canMarkAppointmentNoShow,
    canRevertAppointmentNoShow,
    isAppointmentNoShowStatus,
    parseAppointmentStatusRawToEnum
} from '@/app/entities/appointment/utils/appointment-status.utils';

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
        expect(isAppointmentNoShowStatus(3)).toBe(true);
        expect(isAppointmentNoShowStatus(0)).toBe(false);
        expect(canRevertAppointmentNoShow(3)).toBe(true);
        expect(canRevertAppointmentNoShow(2)).toBe(false);
    });

    describe('canMarkAppointmentNoShow', () => {
        const now = new Date('2026-10-10T10:00:00Z');

        it('yalnızca saati geçmiş Planlandı randevuda', () => {
            expect(canMarkAppointmentNoShow(0, '2026-10-10T09:59:00Z', now)).toBe(true);
            expect(canMarkAppointmentNoShow(0, '2026-10-10T10:00:00Z', now)).toBe(true);
            expect(canMarkAppointmentNoShow(0, '2026-10-10T10:01:00Z', now)).toBe(false);
        });

        it('Tamamlandı / İptal / Gelmedi veya geçersiz saatte yok', () => {
            for (const s of [1, 2, 3, null]) {
                expect(canMarkAppointmentNoShow(s, '2026-10-10T09:00:00Z', now)).toBe(false);
            }

            expect(canMarkAppointmentNoShow(0, null, now)).toBe(false);
            expect(canMarkAppointmentNoShow(0, 'geçersiz', now)).toBe(false);
        });
    });
});

describe('appointment status — İptal', () => {
    it('canCancelAppointment yalnızca Planlandı randevuda (sunucu geçişi Scheduled → Cancelled)', () => {
        expect(canCancelAppointment(0)).toBe(true);
        expect(canCancelAppointment('Scheduled')).toBe(true);

        for (const s of [1, 2, 3, null, undefined, 'x']) {
            expect(canCancelAppointment(s)).toBe(false);
        }
    });
});

describe('appointment status — dizgi kodları dilden bağımsız eşlenir', () => {
    it('büyük harfli kodlar, "I" içerenler dahil (Türkçe ı/İ dönüşümüne takılmaz), eşlenir', () => {
        expect(parseAppointmentStatusRawToEnum('SCHEDULED')).toBe(0);
        expect(parseAppointmentStatusRawToEnum('PLANLANDI')).toBe(0);
        expect(parseAppointmentStatusRawToEnum('COMPLETED')).toBe(1);
        expect(parseAppointmentStatusRawToEnum('TAMAMLANDI')).toBe(1);
        expect(parseAppointmentStatusRawToEnum('CANCELLED')).toBe(2);
        expect(parseAppointmentStatusRawToEnum('IPTAL')).toBe(2);
        expect(parseAppointmentStatusRawToEnum('NO-SHOW')).toBe(3);
        expect(parseAppointmentStatusRawToEnum('GELMEDI')).toBe(3);
    });
});
