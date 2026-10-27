import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE,
    isPrescriptionDateTooFarPastBackendMessage
} from '@/app/entities/prescription/utils/prescription-date-validation.utils';

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
    prescriptiondateutc: 'prescribedAtLocal',
    prescriptiondate: 'prescribedAtLocal',
    issuedatutc: 'prescribedAtLocal',
    title: 'title',
    content: 'content',
    notes: 'notes',
    note: 'notes',
    followupdateutc: 'followUpDate',
    followupdate: 'followUpDate',
    examinationid: 'examinationId',
    treatmentid: 'treatmentId'
};

function normalizePrescriptionUpsertFieldMessage(formKey: PrescriptionUpsertFormFieldKey, message: string): string {
    if (formKey === 'prescribedAtLocal' && isPrescriptionDateTooFarPastBackendMessage(message)) {
        return PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE;
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

function promotePrescriptionDatePastFromProblemDetail(err: HttpErrorResponse): PrescriptionUpsertFieldErrors | null {
    const detail = problemDetailText(err);

    if (isPrescriptionDateTooFarPastBackendMessage(detail)) {
        return { prescribedAtLocal: PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE };
    }

    return null;
}

function promotePrescriptionDatePastFromUnmappedErrors(err: HttpErrorResponse): PrescriptionUpsertFieldErrors | null {
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

        if (msg && isPrescriptionDateTooFarPastBackendMessage(msg)) {
            return { prescribedAtLocal: PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }

    return null;
}

export function parsePrescriptionUpsertHttpError(err: HttpErrorResponse): ParsedPrescriptionUpsertHttpError {
    const parsed = parseValidationHttpError<PrescriptionUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizePrescriptionUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promotePrescriptionDatePastFromProblemDetail(err);

    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promotePrescriptionDatePastFromUnmappedErrors(err);

    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isPrescriptionDateTooFarPastBackendMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { prescribedAtLocal: PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
}
