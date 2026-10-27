import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    TREATMENT_DATE_TOO_FAR_PAST_MESSAGE,
    isTreatmentDateTooFarPastEnglishMessage
} from '@/app/entities/treatment/utils/treatment-date-validation.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type TreatmentUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'treatmentDateLocal'
    | 'examinationId'
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
    treatedatutc: 'treatmentDateLocal',
    treatmentdatetime: 'treatmentDateLocal',
    treatmentdatetimeutc: 'treatmentDateLocal',
    occurredatutc: 'treatmentDateLocal',
    title: 'title',
    description: 'description',
    notes: 'notes',
    note: 'notes',
    followupdateutc: 'followUpDate',
    followupdate: 'followUpDate',
    examinationid: 'examinationId'
};

function normalizeTreatmentUpsertFieldMessage(formKey: TreatmentUpsertFormFieldKey, message: string): string {
    if (formKey === 'treatmentDateLocal' && isTreatmentDateTooFarPastEnglishMessage(message)) {
        return TREATMENT_DATE_TOO_FAR_PAST_MESSAGE;
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

/** Alan eşlemesi olmayan ProblemDetails `detail` metninden tedavi tarihi hatasını çıkarır. */
function promoteTreatmentDatePastFromProblemDetail(err: HttpErrorResponse): TreatmentUpsertFieldErrors | null {
    const detail = problemDetailText(err);

    if (isTreatmentDateTooFarPastEnglishMessage(detail)) {
        return { treatmentDateLocal: TREATMENT_DATE_TOO_FAR_PAST_MESSAGE };
    }

    return null;
}

/** Yapılandırılmış `errors` gövdesinde bilinmeyen anahtarlı tedavi tarihi mesajını yakalar. */
function promoteTreatmentDatePastFromUnmappedErrors(err: HttpErrorResponse): TreatmentUpsertFieldErrors | null {
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

        if (msg && isTreatmentDateTooFarPastEnglishMessage(msg)) {
            return { treatmentDateLocal: TREATMENT_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }

    return null;
}

export function parseTreatmentUpsertHttpError(err: HttpErrorResponse): ParsedTreatmentUpsertHttpError {
    const parsed = parseValidationHttpError<TreatmentUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizeTreatmentUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promoteTreatmentDatePastFromProblemDetail(err);

    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promoteTreatmentDatePastFromUnmappedErrors(err);

    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isTreatmentDateTooFarPastEnglishMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { treatmentDateLocal: TREATMENT_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
}
