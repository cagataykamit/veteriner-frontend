import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const FALLBACK_UPDATE = 'Klinik güncellenemedi.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

export type ClinicUpsertFormFieldKey = 'name' | 'city';
export type ClinicUpsertFieldErrors = Partial<Record<ClinicUpsertFormFieldKey, string>>;

export interface ParsedClinicUpsertHttpError {
    fieldErrors: ClinicUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, ClinicUpsertFormFieldKey> = {
    name: 'name',
    city: 'city'
};

export function parseClinicUpsertHttpError(err: HttpErrorResponse, fallbackGeneric?: string): ParsedClinicUpsertHttpError {
    const fb = fallbackGeneric?.trim() ? fallbackGeneric.trim() : FALLBACK_UPDATE;
    return parseValidationHttpError<ClinicUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, fb),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
