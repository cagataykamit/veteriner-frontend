import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    PAYMENT_DATE_TOO_FAR_PAST_MESSAGE,
    isPaymentDateTooFarPastBackendMessage
} from '@/app/features/payments/utils/payment-date-validation.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type PaymentUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'amount'
    | 'currency'
    | 'method'
    | 'paidAtLocal'
    | 'note';

export type PaymentUpsertFieldErrors = Partial<Record<PaymentUpsertFormFieldKey, string>>;

export interface ParsedPaymentUpsertHttpError {
    fieldErrors: PaymentUpsertFieldErrors;
    summaryMessage: string | null;
}

/** ValidationProblemDetails property adları (normalize edilir); `notes` sunucuda null olabilir. */
const FIELD_MAP: Record<string, PaymentUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    amount: 'amount',
    totalamount: 'amount',
    paymentamount: 'amount',
    currency: 'currency',
    currencycode: 'currency',
    method: 'method',
    paymentmethod: 'method',
    methodtype: 'method',
    paidatutc: 'paidAtLocal',
    paymentdateutc: 'paidAtLocal',
    paidonutc: 'paidAtLocal',
    paymenttimeutc: 'paidAtLocal',
    paymenttime: 'paidAtLocal',
    note: 'note',
    notes: 'note',
    description: 'note'
};

function normalizePaymentUpsertFieldMessage(formKey: PaymentUpsertFormFieldKey, message: string): string {
    if (formKey === 'paidAtLocal' && isPaymentDateTooFarPastBackendMessage(message)) {
        return PAYMENT_DATE_TOO_FAR_PAST_MESSAGE;
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

function promotePaymentDatePastFromProblemDetail(err: HttpErrorResponse): PaymentUpsertFieldErrors | null {
    const detail = problemDetailText(err);

    if (isPaymentDateTooFarPastBackendMessage(detail)) {
        return { paidAtLocal: PAYMENT_DATE_TOO_FAR_PAST_MESSAGE };
    }

    return null;
}

function promotePaymentDatePastFromUnmappedErrors(err: HttpErrorResponse): PaymentUpsertFieldErrors | null {
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

        if (msg && isPaymentDateTooFarPastBackendMessage(msg)) {
            return { paidAtLocal: PAYMENT_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }

    return null;
}

export function parsePaymentUpsertHttpError(err: HttpErrorResponse): ParsedPaymentUpsertHttpError {
    const parsed = parseValidationHttpError<PaymentUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizePaymentUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promotePaymentDatePastFromProblemDetail(err);

    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promotePaymentDatePastFromUnmappedErrors(err);

    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isPaymentDateTooFarPastBackendMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { paidAtLocal: PAYMENT_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
}
