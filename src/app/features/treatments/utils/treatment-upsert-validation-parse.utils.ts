import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type TreatmentUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'treatmentDateLocal'
    | 'title'
    | 'description'
    | 'notes'
    | 'followUpDate';

export type TreatmentUpsertFieldErrors = Partial<Record<TreatmentUpsertFormFieldKey, string>>;

export interface ParsedTreatmentUpsertHttpError {
    fieldErrors: TreatmentUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, TreatmentUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    treatmentdateutc: 'treatmentDateLocal',
    treatmentdate: 'treatmentDateLocal',
    title: 'title',
    description: 'description',
    notes: 'notes',
    note: 'notes',
    followupdateutc: 'followUpDate',
    followupdate: 'followUpDate'
};

export function parseTreatmentUpsertHttpError(err: HttpErrorResponse): ParsedTreatmentUpsertHttpError {
    return parseValidationHttpError<TreatmentUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
