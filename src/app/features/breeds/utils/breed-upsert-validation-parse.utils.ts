import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

export type BreedUpsertFormFieldKey = 'speciesId' | 'code' | 'name' | 'isActive' | 'displayOrder';
export type BreedUpsertFieldErrors = Partial<Record<BreedUpsertFormFieldKey, string>>;

export interface ParsedBreedUpsertHttpError {
    fieldErrors: BreedUpsertFieldErrors;
    summaryMessage: string | null;
}

type ProblemBody = ProblemDetails & {
    errors?: Record<string, string[] | string | unknown> | null;
    validationErrors?: Record<string, string[] | string | unknown> | null;
};

const FIELD_MAP: Record<string, BreedUpsertFormFieldKey> = {
    speciesid: 'speciesId',
    code: 'code',
    name: 'name',
    isactive: 'isActive',
    active: 'isActive',
    displayorder: 'displayOrder',
    order: 'displayOrder'
};

export function parseBreedUpsertHttpError(err: HttpErrorResponse): ParsedBreedUpsertHttpError {
    return parseValidationHttpError<BreedUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: resolveNonFieldErrorMessage,
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}

function resolveNonFieldErrorMessage(err: HttpErrorResponse): string {
    const body = err.error as ProblemBody | string | null | undefined;
    if (typeof body === 'string' && body.trim()) {
        return body.trim();
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
