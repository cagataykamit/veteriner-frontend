import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export const EXAMINATION_CONCURRENCY_CONFLICT_CODE = 'Examinations.ConcurrencyConflict';
export const EXAMINATION_APPOINTMENT_CHANGE_NOT_ALLOWED_CODE = 'Examinations.AppointmentChangeNotAllowed';

export const EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE =
    'Bu kayıt siz düzenlerken başka biri tarafından güncellendi. Yazdıklarınız korundu; güncel kaydı yeni sekmede açıp karşılaştırabilirsiniz.';

export type ExaminationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'examinationDate'
    | 'examinationTime'
    | 'visitReason'
    | 'anamnesis'
    | 'findings'
    | 'weightKg'
    | 'temperatureC'
    | 'heartRateBpm'
    | 'respiratoryRatePerMin'
    | 'vitalsMeasuredAt'
    | 'assessment'
    | 'plan'
    | 'notes';

export type ExaminationUpsertFieldErrors = Partial<Record<ExaminationUpsertFormFieldKey, string>>;

export interface ParsedExaminationUpsertHttpError {
    fieldErrors: ExaminationUpsertFieldErrors;
    summaryMessage: string | null;
    /** `extensions.code` (varsa), örn. `Examinations.ConcurrencyConflict`. */
    code: string | null;
    /** Yalnızca 409 + `Examinations.ConcurrencyConflict`. */
    isConcurrencyConflict: boolean;
}

/** Sunucu validation hata anahtarları (camelCase normalize edilir). */
const FIELD_MAP: Record<string, ExaminationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    examinedatutc: 'examinationDate',
    examinationdateutc: 'examinationDate',
    scheduledatutc: 'examinationDate',
    visitreason: 'visitReason',
    /** Eski/alias hata kodları — gövdeye `complaint` gönderilmiyor. */
    complaint: 'visitReason',
    complainttext: 'visitReason',
    anamnesis: 'anamnesis',
    findings: 'findings',
    finding: 'findings',
    weightkg: 'weightKg',
    temperaturec: 'temperatureC',
    heartratebpm: 'heartRateBpm',
    respiratoryratepermin: 'respiratoryRatePerMin',
    vitalsmeasuredatutc: 'vitalsMeasuredAt',
    assessment: 'assessment',
    diagnosis: 'assessment',
    plan: 'plan',
    notes: 'notes',
    note: 'notes'
};

export function parseExaminationUpsertHttpError(err: HttpErrorResponse): ParsedExaminationUpsertHttpError {
    const code = problemCodeFromHttpError(err);
    // 409 yalnızca eşzamanlılık çakışması içindir; başka 409 kodları genel hata yoluna düşer.
    if (err.status === 409 && code === EXAMINATION_CONCURRENCY_CONFLICT_CODE) {
        return {
            fieldErrors: {},
            summaryMessage: EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE,
            code,
            isConcurrencyConflict: true
        };
    }
    const parsed = parseValidationHttpError<ExaminationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
    return { ...parsed, code, isConcurrencyConflict: false };
}
