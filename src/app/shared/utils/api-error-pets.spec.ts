import { HttpErrorResponse } from '@angular/common/http';
import { messageFromAppointmentUpsertHttpError } from '@/app/features/appointments/utils/appointment-upsert-error.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const problem = (code: string) =>
    new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'Pet is deceased.', extensions: { code } } });

describe('api-error: hayvan durumu kodları (ADR-020 S5)', () => {
    it('Pets.Deceased yeni geliş/muayene/randevu için Türkçe ve yol gösteren mesaj olur', () => {
        const msg = messageFromHttpError(problem('Pets.Deceased'));
        expect(msg).toContain('vefat');
        expect(msg).toContain('Aktife al');
    });

    it('randevu formu da aynı mesajı gösterir (çakışma metnine düşmez)', () => {
        expect(messageFromAppointmentUpsertHttpError(problem('Pets.Deceased'))).toBe(messageFromHttpError(problem('Pets.Deceased')));
    });

    it('Pets.ConcurrencyConflict yenileme ister', () => {
        expect(messageFromHttpError(problem('Pets.ConcurrencyConflict'))).toContain('başka biri');
    });
});
