import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type PrescriptionUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'prescribedAtLocal'
    | 'title'
    | 'content'
    | 'notes'
    | 'followUpDate'
    | 'examinationId'
    | 'treatmentId';

export type PrescriptionUpsertFieldErrors = Partial<Record<PrescriptionUpsertFormFieldKey, string>>;

export interface ParsedPrescriptionUpsertHttpError {
    fieldErrors: PrescriptionUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, PrescriptionUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    prescribedatutc: 'prescribedAtLocal',
    prescribedat: 'prescribedAtLocal',
    title: 'title',
    content: 'content',
    notes: 'notes',
    note: 'notes',
    followupdateutc: 'followUpDate',
    followupdate: 'followUpDate',
    examinationid: 'examinationId',
    treatmentid: 'treatmentId'
};

export function parsePrescriptionUpsertHttpError(err: HttpErrorResponse): ParsedPrescriptionUpsertHttpError {
    return parseValidationHttpError<PrescriptionUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
