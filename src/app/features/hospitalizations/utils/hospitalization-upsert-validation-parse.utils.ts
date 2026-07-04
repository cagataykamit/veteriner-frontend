import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE,
    isHospitalizationDateTooFarPastBackendMessage
} from '@/app/features/hospitalizations/utils/hospitalization-date-validation.utils';

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
    admissiontimeutc: 'admittedAtLocal',
    admissiontime: 'admittedAtLocal',
    planneddischargeatutc: 'plannedDischargeAtLocal',
    planneddischargeat: 'plannedDischargeAtLocal',
    examinationid: 'examinationId',
    reason: 'reason',
    notes: 'notes',
    note: 'notes'
};

function normalizeHospitalizationUpsertFieldMessage(formKey: HospitalizationUpsertFormFieldKey, message: string): string {
    if (formKey === 'admittedAtLocal' && isHospitalizationDateTooFarPastBackendMessage(message)) {
        return HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE;
    }
    return message.trim();
}

function problemDetailText(err: HttpErrorResponse): string {
    const body = err.error as Record<string, unknown> | null | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return '';
    }
    const detail = typeof body['detail'] === 'string' ? body['detail'] : typeof body['Detail'] === 'string' ? body['Detail'] : '';
    const title = typeof body['title'] === 'string' ? body['title'] : typeof body['Title'] === 'string' ? body['Title'] : '';
    return [detail, title].filter(Boolean).join('\n').trim();
}

function promoteHospitalizationDatePastFromProblemDetail(err: HttpErrorResponse): HospitalizationUpsertFieldErrors | null {
    const detail = problemDetailText(err);
    if (isHospitalizationDateTooFarPastBackendMessage(detail)) {
        return { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE };
    }
    return null;
}

function promoteHospitalizationDatePastFromUnmappedErrors(err: HttpErrorResponse): HospitalizationUpsertFieldErrors | null {
    const raw = extractRawValidationErrors(err.error);
    if (!raw) {
        return null;
    }
    for (const [apiKey, val] of Object.entries(raw)) {
        const normalizedKey = apiKey
            .replace(/^\$/, '')
            .replace(/\[\d+]$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        if (FIELD_MAP[normalizedKey]) {
            continue;
        }
        const msg = firstStringMessage(val);
        if (msg && isHospitalizationDateTooFarPastBackendMessage(msg)) {
            return { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }
    return null;
}

export function parseHospitalizationUpsertHttpError(err: HttpErrorResponse): ParsedHospitalizationUpsertHttpError {
    const parsed = parseValidationHttpError<HospitalizationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizeHospitalizationUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promoteHospitalizationDatePastFromProblemDetail(err);
    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promoteHospitalizationDatePastFromUnmappedErrors(err);
    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isHospitalizationDateTooFarPastBackendMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
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
