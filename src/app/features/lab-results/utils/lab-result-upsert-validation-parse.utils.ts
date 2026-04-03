import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type LabResultUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'resultDateLocal'
    | 'examinationId'
    | 'testName'
    | 'resultText'
    | 'interpretation'
    | 'notes';

export type LabResultUpsertFieldErrors = Partial<Record<LabResultUpsertFormFieldKey, string>>;

export interface ParsedLabResultUpsertHttpError {
    fieldErrors: LabResultUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, LabResultUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    resultdateutc: 'resultDateLocal',
    resultdate: 'resultDateLocal',
    testname: 'testName',
    resulttext: 'resultText',
    interpretation: 'interpretation',
    notes: 'notes',
    note: 'notes',
    examinationid: 'examinationId'
};

export function parseLabResultUpsertHttpError(err: HttpErrorResponse): ParsedLabResultUpsertHttpError {
    return parseValidationHttpError<LabResultUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
