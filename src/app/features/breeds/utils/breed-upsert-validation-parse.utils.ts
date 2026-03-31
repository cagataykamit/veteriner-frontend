import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

export type BreedUpsertFormFieldKey = 'speciesId' | 'name' | 'isActive';
export type BreedUpsertFieldErrors = Partial<Record<BreedUpsertFormFieldKey, string>>;

export interface ParsedBreedUpsertHttpError {
    fieldErrors: BreedUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, BreedUpsertFormFieldKey> = {
    speciesid: 'speciesId',
    name: 'name',
    isactive: 'isActive',
    active: 'isActive'
};

export function parseBreedUpsertHttpError(err: HttpErrorResponse): ParsedBreedUpsertHttpError {
    return parseValidationHttpError<BreedUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
