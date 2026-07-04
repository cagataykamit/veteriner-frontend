import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE,
    isLabResultDateTooFarPastBackendMessage
} from '@/app/features/lab-results/utils/lab-result-date-validation.utils';

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
    resultdatetimeutc: 'resultDateLocal',
    testname: 'testName',
    resulttext: 'resultText',
    interpretation: 'interpretation',
    notes: 'notes',
    note: 'notes',
    examinationid: 'examinationId'
};

function normalizeLabResultUpsertFieldMessage(formKey: LabResultUpsertFormFieldKey, message: string): string {
    if (formKey === 'resultDateLocal' && isLabResultDateTooFarPastBackendMessage(message)) {
        return LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE;
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

function promoteLabResultDatePastFromProblemDetail(err: HttpErrorResponse): LabResultUpsertFieldErrors | null {
    const detail = problemDetailText(err);
    if (isLabResultDateTooFarPastBackendMessage(detail)) {
        return { resultDateLocal: LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE };
    }
    return null;
}

function promoteLabResultDatePastFromUnmappedErrors(err: HttpErrorResponse): LabResultUpsertFieldErrors | null {
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
        if (msg && isLabResultDateTooFarPastBackendMessage(msg)) {
            return { resultDateLocal: LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }
    return null;
}

export function parseLabResultUpsertHttpError(err: HttpErrorResponse): ParsedLabResultUpsertHttpError {
    const parsed = parseValidationHttpError<LabResultUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizeLabResultUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promoteLabResultDatePastFromProblemDetail(err);
    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promoteLabResultDatePastFromUnmappedErrors(err);
    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isLabResultDateTooFarPastBackendMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { resultDateLocal: LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
}
