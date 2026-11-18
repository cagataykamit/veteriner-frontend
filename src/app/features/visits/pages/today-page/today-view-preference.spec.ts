import { readTodayScope, readTodayView, writeTodayScope, writeTodayView } from '@/app/features/visits/pages/today-page/today-view-preference';

describe('today-view-preference', () => {
    beforeEach(() => localStorage.clear());

    it('kayıt yoksa günlük liste ve kapsam yok (sayfa varsayılanı)', () => {
        expect(readTodayView()).toBe('today');
        expect(readTodayScope()).toBeNull();
    });

    it('son seçim geri okunur', () => {
        writeTodayView('voided');
        writeTodayScope('all');

        expect(readTodayView()).toBe('voided');
        expect(readTodayScope()).toBe('all');
    });

    it('tanınmayan kayıt yok sayılır', () => {
        localStorage.setItem('vetinity.today.view', 'x');
        localStorage.setItem('vetinity.today.scope', 'y');

        expect(readTodayView()).toBe('today');
        expect(readTodayScope()).toBeNull();
    });
});
