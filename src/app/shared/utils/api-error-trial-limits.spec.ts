import { HttpErrorResponse } from '@angular/common/http';
import { isTrialLimitError, messageFromHttpError, trialLimitProblemCode, TrialLimitError, userErrorFromHttp } from '@/app/shared/utils/api-error.utils';

const EXPORT_DETAIL = 'Deneme sürümünde dışa aktarma en fazla 1000 satır sınırı; abonelikle kalkar. Filtreyi daraltın.';

const problem = (code: string, detail: string | null = EXPORT_DETAIL, status = 422) =>
    new HttpErrorResponse({ status, error: { status, title: 'İş kuralı ihlali', detail, code } });

describe('api-error: deneme kısıtları (TRIAL-004, docs/TRIAL_LIMITS_API_CONTRACT.md §3)', () => {
    it('Trial.ExportLimitExceeded: sunucunun detail metni olduğu gibi gösterilir', () => {
        expect(messageFromHttpError(problem('Trial.ExportLimitExceeded'))).toBe(EXPORT_DETAIL);
    });

    it('Trial.ImportLimitExceeded: tablo adını içeren detail korunur', () => {
        const detail = 'Deneme sürümünde içe aktarma tablo başına en fazla 500 satır sınırı (Müşteriler tablosu aşıyor); abonelikle kalkar.';

        expect(messageFromHttpError(problem('Trial.ImportLimitExceeded', detail))).toBe(detail);
    });

    it('detail yoksa koda göre sözleşme metnine düşer; 422 genel metnine düşmez', () => {
        expect(messageFromHttpError(problem('Trial.ExportLimitExceeded', null))).toContain('1000 satır');
        expect(messageFromHttpError(problem('Trial.ImportLimitExceeded', ''))).toContain('500 satır');
        expect(messageFromHttpError(problem('Trial.BilinmeyenKisit', null))).toContain('abonelikle kalkar');
    });

    it('extensions.code içinden de tanınır', () => {
        const err = new HttpErrorResponse({ status: 422, error: { detail: EXPORT_DETAIL, extensions: { code: 'Trial.ExportLimitExceeded' } } });

        expect(trialLimitProblemCode(err)).toBe('Trial.ExportLimitExceeded');
    });

    it('userErrorFromHttp deneme kısıtında TrialLimitError üretir, diğer kodlarda düz Error', () => {
        const trial = userErrorFromHttp(problem('Trial.ExportLimitExceeded'), 'yedek');
        const paid = userErrorFromHttp(problem('Payments.ReportExportTooManyRows', 'Çok fazla satır.', 400), 'yedek');

        expect(trial).toBeInstanceOf(TrialLimitError);
        expect((trial as TrialLimitError).code).toBe('Trial.ExportLimitExceeded');
        expect(trial.message).toBe(EXPORT_DETAIL);
        expect(paid).not.toBeInstanceOf(TrialLimitError);
        expect(paid.message).toBe('Çok fazla satır.');
    });

    it('isTrialLimitError: TrialLimitError ve ham Trial.* HttpErrorResponse için true; diğerleri false', () => {
        expect(isTrialLimitError(new TrialLimitError('m', 'Trial.ImportLimitExceeded'))).toBeTrue();
        expect(isTrialLimitError(problem('Trial.ImportLimitExceeded'))).toBeTrue();
        expect(isTrialLimitError(problem('Imports.TooManyRows', 'x', 400))).toBeFalse();
        expect(isTrialLimitError(new Error('Trial.ExportLimitExceeded'))).toBeFalse();
        expect(isTrialLimitError(null)).toBeFalse();
    });
});
