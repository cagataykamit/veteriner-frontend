import { HttpErrorResponse } from '@angular/common/http';
import { parseLabResultUpsertHttpError } from '@/app/features/lab-results/utils/lab-result-upsert-validation-parse.utils';

const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
    new HttpErrorResponse({ status, error: { status, extensions: { code }, ...extra } });

describe('parseLabResultUpsertHttpError', () => {
    it('409 + LabResults.ConcurrencyConflict çakışma olarak işaretlenir ve anlaşılır mesaj verir', () => {
        const r = parseLabResultUpsertHttpError(problem(409, 'LabResults.ConcurrencyConflict', { detail: 'sunucu metni' }));
        expect(r.isConcurrencyConflict).toBeTrue();
        expect(r.summaryMessage).toBe('Bu lab kaydı siz düzenlerken başka biri tarafından güncellendi.');
    });

    it('başka 409 kodu (Examinations.Finalized) çakışma sayılmaz', () => {
        const r = parseLabResultUpsertHttpError(problem(409, 'Examinations.Finalized'));
        expect(r.isConcurrencyConflict).toBeFalse();
        expect(r.summaryMessage).toContain('kesinleştirilmiş');
    });
});
