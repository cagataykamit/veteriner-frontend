import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

export type SpeciesUpsertFormFieldKey = 'code' | 'name' | 'isActive' | 'displayOrder';
export type SpeciesUpsertFieldErrors = Partial<Record<SpeciesUpsertFormFieldKey, string>>;

export interface ParsedSpeciesUpsertHttpError {
    fieldErrors: SpeciesUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, SpeciesUpsertFormFieldKey> = {
    code: 'code',
    name: 'name',
    isactive: 'isActive',
    active: 'isActive',
    displayorder: 'displayOrder',
    order: 'displayOrder'
};

export function parseSpeciesUpsertHttpError(err: HttpErrorResponse): ParsedSpeciesUpsertHttpError {
    return parseValidationHttpError<SpeciesUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
