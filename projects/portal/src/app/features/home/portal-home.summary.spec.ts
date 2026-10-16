import { appointment, PET_BONCUK, PET_PAMUK, VACCINATIONS_PAMUK } from '@portal/app/testing/portal-fixtures';
import { nextScheduledAppointment, summarizeVaccines } from './portal-home.summary';

describe('Ana ekran özeti', () => {
    it('gecikmiş ayrımı sunucunun isOverdue alanıdır; gecikmemiş en yakın aşı "sıradaki" olur', () => {
        const summary = summarizeVaccines([{ pet: PET_PAMUK, vaccinations: VACCINATIONS_PAMUK }]);

        expect(summary.overdue.map((a) => a.vaccineName)).toEqual(['Karma']);
        expect(summary.next?.vaccineName).toBe('Kuduz');
    });

    it('vefat eden hayvanın aşısı uyarıya girmez (ADR-028 madde 4)', () => {
        const summary = summarizeVaccines([{ pet: PET_BONCUK, vaccinations: VACCINATIONS_PAMUK }]);

        expect(summary.overdue).toEqual([]);
        expect(summary.next).toBeNull();
    });

    it('birden çok gecikmiş aşı en eski vade önce sıralanır', () => {
        const summary = summarizeVaccines([
            { pet: PET_PAMUK, vaccinations: { history: [], upcoming: [{ vaccinationId: 'a', vaccineName: 'Kuduz', dueAtUtc: '2026-10-10T00:00:00', isOverdue: true }] } },
            {
                pet: { ...PET_PAMUK, petId: 'pet-3', name: 'Zeytin' },
                vaccinations: { history: [], upcoming: [{ vaccinationId: 'b', vaccineName: 'Karma', dueAtUtc: '2026-09-01T00:00:00', isOverdue: true }] }
            }
        ]);

        expect(summary.overdue.map((a) => a.petName)).toEqual(['Zeytin', 'Pamuk']);
    });

    it('en yakın randevu iptal edilmemiş ilk planlı randevudur', () => {
        const items = [appointment({ appointmentId: 'x', status: 'Cancelled' }), appointment({ appointmentId: 'y' })];

        expect(nextScheduledAppointment(items)?.appointmentId).toBe('y');
        expect(nextScheduledAppointment([appointment({ status: 'Cancelled' })])).toBeNull();
    });
});
