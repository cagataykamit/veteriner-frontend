import { HttpErrorResponse } from '@angular/common/http';
import {
    EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE,
    parseExaminationUpsertHttpError
} from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';

const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
    new HttpErrorResponse({ status, error: { status, extensions: { code }, ...extra } });

describe('parseExaminationUpsertHttpError', () => {
    it('409 + ConcurrencyConflict çakışma olarak işaretlenir ve code taşınır', () => {
        const r = parseExaminationUpsertHttpError(problem(409, 'Examinations.ConcurrencyConflict', { detail: 'sunucu metni' }));
        expect(r.isConcurrencyConflict).toBeTrue();
        expect(r.code).toBe('Examinations.ConcurrencyConflict');
        expect(r.summaryMessage).toBe(EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE);
    });

    it('AppointmentChangeNotAllowed 400 döner ve çakışma sayılmaz', () => {
        const r = parseExaminationUpsertHttpError(
            problem(400, 'Examinations.AppointmentChangeNotAllowed', { detail: 'Randevu değiştirilemez.' })
        );
        expect(r.isConcurrencyConflict).toBeFalse();
        expect(r.code).toBe('Examinations.AppointmentChangeNotAllowed');
        expect(r.summaryMessage).toBe('Randevu değiştirilemez.');
    });

    it('ConcurrencyConflict kodu 409 olmayan durumda çakışma sayılmaz; başka 409 kodu da sayılmaz', () => {
        expect(parseExaminationUpsertHttpError(problem(400, 'Examinations.ConcurrencyConflict')).isConcurrencyConflict).toBeFalse();
        expect(parseExaminationUpsertHttpError(problem(409, 'Examinations.Other')).isConcurrencyConflict).toBeFalse();
    });

    it('doğrulama alan hatalarını yeni alanlar için de ayrıştırır ve özet verir', () => {
        const err = new HttpErrorResponse({
            status: 400,
            error: {
                extensions: { code: 'Examinations.Validation' },
                errors: { WeightKg: ['Kilo geçersiz'], RespiratoryRatePerMin: ['Geçersiz'], Plan: ['Çok uzun'] }
            }
        });
        const r = parseExaminationUpsertHttpError(err);
        expect(r.code).toBe('Examinations.Validation');
        expect(r.fieldErrors.weightKg).toBe('Kilo geçersiz');
        expect(r.fieldErrors.respiratoryRatePerMin).toBe('Geçersiz');
        expect(r.fieldErrors.plan).toBe('Çok uzun');
        expect(r.summaryMessage).toBe('Lütfen hatalı alanları düzeltin.');
    });

    it('ağ hatasında (status 0) kod yoktur ve mesaj üretilir', () => {
        const r = parseExaminationUpsertHttpError(new HttpErrorResponse({ status: 0 }));
        expect(r.code).toBeNull();
        expect(r.isConcurrencyConflict).toBeFalse();
        expect(r.summaryMessage).toBeTruthy();
    });
});
