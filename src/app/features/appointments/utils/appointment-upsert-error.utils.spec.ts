import { HttpErrorResponse } from '@angular/common/http';
import { messageFromAppointmentUpsertHttpError } from '@/app/features/appointments/utils/appointment-upsert-error.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const problem = (code: string) =>
    new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'Pet is deceased.', extensions: { code } } });

describe('appointment-upsert-error: hayvan durumu kodları (ADR-020 S5)', () => {
    it('randevu formu Pets.Deceased için genel mesajı gösterir (çakışma metnine düşmez)', () => {
        expect(messageFromAppointmentUpsertHttpError(problem('Pets.Deceased'))).toBe(messageFromHttpError(problem('Pets.Deceased')));
    });
});
