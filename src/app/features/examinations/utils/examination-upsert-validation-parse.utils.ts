import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type ExaminationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'examinationDateLocal'
    | 'visitReason'
    | 'notes'
    | 'findings'
    | 'assessment';

export type ExaminationUpsertFieldErrors = Partial<Record<ExaminationUpsertFormFieldKey, string>>;

export interface ParsedExaminationUpsertHttpError {
    fieldErrors: ExaminationUpsertFieldErrors;
    summaryMessage: string | null;
}

/** Sunucu validation hata anahtarları (camelCase normalize edilir); form alanı `visitReason`. */
const FIELD_MAP: Record<string, ExaminationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    examinedatutc: 'examinationDateLocal',
    examinationdateutc: 'examinationDateLocal',
    scheduledatutc: 'examinationDateLocal',
    visitreason: 'visitReason',
    /** Eski/alias hata kodları — gövdeye `complaint` gönderilmiyor. */
    complaint: 'visitReason',
    complainttext: 'visitReason',
    notes: 'notes',
    note: 'notes',
    findings: 'findings',
    finding: 'findings',
    assessment: 'assessment',
    diagnosis: 'assessment'
};

export function parseExaminationUpsertHttpError(err: HttpErrorResponse): ParsedExaminationUpsertHttpError {
    return parseValidationHttpError<ExaminationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
