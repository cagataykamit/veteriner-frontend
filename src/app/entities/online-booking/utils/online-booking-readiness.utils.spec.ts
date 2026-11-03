import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { onlineBookingGaps, onlineBookingReadiness, onlineVisibleReasons } from './online-booking-readiness.utils';

const reason = (over: Partial<AppointmentReasonVm>): AppointmentReasonVm => ({
    id: 'r',
    clinicId: 'k1',
    name: 'Aşı',
    defaultDurationMinutes: 15,
    isOnlineBookable: true,
    sortOrder: 1,
    isActive: true,
    veterinarianUserIds: [],
    ...over
});

const open = { dayOfWeek: 1, dayLabel: 'Pzt', isClosed: false, opensAt: '09:00', closesAt: '18:00', breakStartsAt: null, breakEndsAt: null };
const closed = { ...open, isClosed: true, opensAt: null, closesAt: null };

describe('onlineBookingReadiness', () => {
    it('yalnız aktif ve online görünen nedenler sayılır, sıraya göre', () => {
        const list = onlineVisibleReasons([
            reason({ id: 'b', sortOrder: 2 }),
            reason({ id: 'a', sortOrder: 1 }),
            reason({ id: 'x', isActive: false }),
            reason({ id: 'y', isOnlineBookable: false })
        ]);

        expect(list.map((r) => r.id)).toEqual(['a', 'b']);
    });

    it('nedensiz klinik uyarı; açık gün yoksa eksik; telefon yoksa uyarı', () => {
        const items = onlineBookingReadiness({ reasons: [], workingHours: [closed], clinicPhone: '  ' });

        expect(items.map((i) => [i.key, i.level])).toEqual([
            ['reasons', 'warn'],
            ['workingHours', 'missing'],
            ['phone', 'warn']
        ]);
        expect(onlineBookingGaps(items).length).toBe(3);
    });

    it('her şey hazırsa eksik yok; okunamayan saat ve telefon maddesi gösterilmez', () => {
        expect(onlineBookingGaps(onlineBookingReadiness({ reasons: [reason({})], workingHours: [open], clinicPhone: '0212' }))).toEqual([]);
        expect(onlineBookingReadiness({ reasons: [reason({})], workingHours: null, clinicPhone: undefined }).map((i) => i.key)).toEqual(['reasons']);
    });
});
