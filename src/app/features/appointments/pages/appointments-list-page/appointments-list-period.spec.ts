import { appointmentListWindow, readAppointmentListPeriod, writeAppointmentListPeriod } from './appointments-list-period';

describe('appointmentListWindow — randevu listesi dönemi ve sırası', () => {
    const none = { fromDate: '', toDate: '' };

    it('yaklaşan: bugünün başından itibaren, en yakın üstte', () => {
        expect(appointmentListWindow('upcoming', none, '2026-11-20')).toEqual({ fromDate: '2026-11-20', order: 'asc' });
    });

    it('geçmiş: dünün sonuna kadar, en yeni geçmiş üstte (bugünün randevuları yaklaşan tarafında)', () => {
        expect(appointmentListWindow('past', none, '2026-11-01')).toEqual({ toDate: '2026-10-31', order: 'desc' });
    });

    it('tümü: tarih sınırı yok, en yeni üstte', () => {
        expect(appointmentListWindow('all', none, '2026-11-20')).toEqual({ order: 'desc' });
    });

    it('girilen tarih aralığı dönemin yerine geçer ve artan sıralanır', () => {
        expect(appointmentListWindow('past', { fromDate: '2026-12-01', toDate: '2026-12-31' }, '2026-11-20')).toEqual({ fromDate: '2026-12-01', toDate: '2026-12-31', order: 'asc' });
        expect(appointmentListWindow('upcoming', { fromDate: '', toDate: '2026-10-01' }, '2026-11-20')).toEqual({ fromDate: undefined, toDate: '2026-10-01', order: 'asc' });
    });
});

describe('randevu listesi dönem tercihi', () => {
    const KEY = 'vetinity.appointments.period';

    afterEach(() => localStorage.removeItem(KEY));

    it('kayıt yoksa ya da tanınmıyorsa yaklaşan; kaydedilen geri okunur', () => {
        expect(readAppointmentListPeriod()).toBe('upcoming');
        localStorage.setItem(KEY, 'eski');
        expect(readAppointmentListPeriod()).toBe('upcoming');
        writeAppointmentListPeriod('past');
        expect(readAppointmentListPeriod()).toBe('past');
    });
});
