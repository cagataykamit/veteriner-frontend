import { HttpErrorResponse } from '@angular/common/http';
import {
    HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE,
    HOSPITALIZATION_ROOM_PROBLEM_MESSAGES,
    parseHospitalizationDischargeHttpError,
    parseHospitalizationUpsertHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';

function problem(status: number, code: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { extensions: { code } } });
}

describe('hospitalization-upsert-validation-parse.utils', () => {
    it('409 Hospitalizations.ConcurrencyConflict çakışma sayılır ve anlaşılır mesaj verir', () => {
        const parsed = parseHospitalizationUpsertHttpError(problem(409, 'Hospitalizations.ConcurrencyConflict'));

        expect(parsed.isConcurrencyConflict).toBe(true);
        expect(parsed.summaryMessage).toContain('başka biri tarafından güncellendi');
    });

    it('taburcuda da aynı çakışma kodu tanınır', () => {
        expect(parseHospitalizationDischargeHttpError(problem(409, 'Hospitalizations.ConcurrencyConflict')).isConcurrencyConflict).toBe(true);
    });

    it('409 Examinations.Finalized muayene alanına yatışa özel Türkçe mesaj yazar, çakışma değildir', () => {
        const parsed = parseHospitalizationUpsertHttpError(problem(409, 'Examinations.Finalized'));

        expect(parsed.isConcurrencyConflict).toBe(false);
        expect(parsed.fieldErrors.examinationId).toBe(HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE);
    });

    it('geliş uyuşmazlığı kodları Türkçe mesaja çevrilir', () => {
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.ExaminationVisitMismatch')).summaryMessage).toContain('muayenenin gelişiyle');
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.VisitPetMismatch')).summaryMessage).toContain('hastayla');
        expect(parseHospitalizationUpsertHttpError(problem(404, 'Visits.NotFound')).summaryMessage).toContain('Geliş kaydı bulunamadı');
    });

    it('çakışma dışı hata çakışma işaretlemez', () => {
        expect(parseHospitalizationUpsertHttpError(problem(400, 'Hospitalizations.VisitClinicMismatch')).isConcurrencyConflict).toBe(false);
    });

    it('oda kodları (RoomNotFound 404, RoomInactive 409) oda alanına Türkçe mesaj yazar, çakışma değildir', () => {
        const notFound = parseHospitalizationUpsertHttpError(problem(404, 'Hospitalizations.RoomNotFound'));
        const inactive = parseHospitalizationUpsertHttpError(problem(409, 'Hospitalizations.RoomInactive'));

        expect(notFound.fieldErrors.roomId).toBe(HOSPITALIZATION_ROOM_PROBLEM_MESSAGES['Hospitalizations.RoomNotFound']);
        expect(inactive.fieldErrors.roomId).toContain('pasife alınmış');
        expect(inactive.isConcurrencyConflict).toBe(false);
    });

    it('sunucunun location / clearRoom alan hataları oda alanında gösterilir', () => {
        const err = new HttpErrorResponse({ status: 400, error: { errors: { ClearRoom: ['roomId ile birlikte gönderilemez'] } } });

        expect(parseHospitalizationUpsertHttpError(err).fieldErrors.roomId).toBe('roomId ile birlikte gönderilemez');
    });
});
