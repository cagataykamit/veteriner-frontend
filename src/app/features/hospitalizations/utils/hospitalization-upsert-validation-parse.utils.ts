import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type HospitalizationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'admittedAtLocal'
    | 'plannedDischargeAtLocal'
    | 'examinationId'
    | 'reason'
    | 'notes';

export type HospitalizationUpsertFieldErrors = Partial<Record<HospitalizationUpsertFormFieldKey, string>>;

export interface ParsedHospitalizationUpsertHttpError {
    fieldErrors: HospitalizationUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, HospitalizationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    admittedatutc: 'admittedAtLocal',
    admittedat: 'admittedAtLocal',
    planneddischargeatutc: 'plannedDischargeAtLocal',
    planneddischargeat: 'plannedDischargeAtLocal',
    examinationid: 'examinationId',
    reason: 'reason',
    notes: 'notes',
    note: 'notes'
};

export function parseHospitalizationUpsertHttpError(err: HttpErrorResponse): ParsedHospitalizationUpsertHttpError {
    return parseValidationHttpError<HospitalizationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}

export type HospitalizationDischargeFormFieldKey = 'dischargedAtLocal' | 'notes';

export type HospitalizationDischargeFieldErrors = Partial<Record<HospitalizationDischargeFormFieldKey, string>>;

export interface ParsedHospitalizationDischargeHttpError {
    fieldErrors: HospitalizationDischargeFieldErrors;
    summaryMessage: string | null;
}

const DISCHARGE_FIELD_MAP: Record<string, HospitalizationDischargeFormFieldKey> = {
    dischargedatutc: 'dischargedAtLocal',
    dischargedat: 'dischargedAtLocal',
    notes: 'notes',
    note: 'notes'
};

export function parseHospitalizationDischargeHttpError(
    err: HttpErrorResponse
): ParsedHospitalizationDischargeHttpError {
    return parseValidationHttpError<HospitalizationDischargeFormFieldKey>(err, {
        fieldMap: DISCHARGE_FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, 'Taburcu işlemi tamamlanamadı.'),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
