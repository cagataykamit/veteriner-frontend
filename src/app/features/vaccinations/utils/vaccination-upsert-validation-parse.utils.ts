import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type VaccinationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'vaccineName'
    | 'appliedAtLocal'
    | 'nextDueDate'
    | 'status'
    | 'notes';

export type VaccinationUpsertFieldErrors = Partial<Record<VaccinationUpsertFormFieldKey, string>>;

export interface ParsedVaccinationUpsertHttpError {
    fieldErrors: VaccinationUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, VaccinationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    vaccinename: 'vaccineName',
    name: 'vaccineName',
    appliedatutc: 'appliedAtLocal',
    applicationdateutc: 'appliedAtLocal',
    appliedonutc: 'appliedAtLocal',
    nextdueatutc: 'nextDueDate',
    nextdoseatutc: 'nextDueDate',
    dueatutc: 'nextDueDate',
    status: 'status',
    vaccinationstatus: 'status',
    lifecyclestatus: 'status',
    notes: 'notes',
    note: 'notes',
    description: 'notes'
};

export function parseVaccinationUpsertHttpError(err: HttpErrorResponse): ParsedVaccinationUpsertHttpError {
    return parseValidationHttpError<VaccinationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
