import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export type PaymentUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'amount'
    | 'currency'
    | 'method'
    | 'status'
    | 'dueDate'
    | 'paidAtLocal'
    | 'note';

export type PaymentUpsertFieldErrors = Partial<Record<PaymentUpsertFormFieldKey, string>>;

export interface ParsedPaymentUpsertHttpError {
    fieldErrors: PaymentUpsertFieldErrors;
    summaryMessage: string | null;
}

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
    status: 'status',
    paymentstatus: 'status',
    lifecyclestatus: 'status',
    duedateutc: 'dueDate',
    dueatutc: 'dueDate',
    paidatutc: 'paidAtLocal',
    paymentdateutc: 'paidAtLocal',
    paidonutc: 'paidAtLocal',
    note: 'note',
    notes: 'note',
    description: 'note'
};

export function parsePaymentUpsertHttpError(err: HttpErrorResponse): ParsedPaymentUpsertHttpError {
    return parseValidationHttpError<PaymentUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
