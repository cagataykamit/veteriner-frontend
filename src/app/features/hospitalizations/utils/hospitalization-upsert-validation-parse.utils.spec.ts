import { HttpErrorResponse } from '@angular/common/http';
import {
    HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE,
    parseHospitalizationDischargeHttpError,
    parseHospitalizationUpsertHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';

function problem(status: number, code: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { extensions: { code } } });
}

describe('hospitalization-upsert-validation-parse.utils', () => {
    it('409 Hospitalizations.ConcurrencyConflict çakışma sayılır ve anlaşılır mesaj verir', () => {
        const parsed = parseHospitalizationUpsertHttpError(problem(409, 'Hospitalizations.ConcurrencyConflict'));

        expect(parsed.isConcurrencyConflict).toBeTrue();
        expect(parsed.summaryMessage).toContain('başka biri tarafından güncellendi');
    });

    it('taburcuda da aynı çakışma kodu tanınır', () => {
        expect(parseHospitalizationDischargeHttpError(problem(409, 'Hospitalizations.ConcurrencyConflict')).isConcurrencyConflict).toBeTrue();
    });

    it('409 Examinations.Finalized muayene alanına yatışa özel Türkçe mesaj yazar, çakışma değildir', () => {
        const parsed = parseHospitalizationUpsertHttpError(problem(409, 'Examinations.Finalized'));

        expect(parsed.isConcurrencyConflict).toBeFalse();
        expect(parsed.fieldErrors.examinationId).toBe(HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE);
    });

    it('geliş uyuşmazlığı kodları Türkçe mesaja çevrilir', () => {
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.ExaminationVisitMismatch')).summaryMessage).toContain('muayenenin gelişiyle');
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.VisitPetMismatch')).summaryMessage).toContain('hastayla');
        expect(parseHospitalizationUpsertHttpError(problem(404, 'Visits.NotFound')).summaryMessage).toContain('Geliş kaydı bulunamadı');
    });

    it('çakışma dışı hata çakışma işaretlemez', () => {
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.VisitClinicMismatch')).isConcurrencyConflict).toBeFalse();
    });
});
