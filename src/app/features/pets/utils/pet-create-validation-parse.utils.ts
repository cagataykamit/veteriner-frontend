import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromPetCreateHttpError } from '@/app/features/pets/utils/pet-create-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

/** Pet create form kontrol adlarıyla hizalı (`weight` API → `weightStr` form). */
export type PetCreateFormFieldKey =
    | 'clientId'
    | 'name'
    | 'speciesId'
    | 'breedId'
    | 'gender'
    | 'birthDate'
    | 'color'
    | 'weightStr'
    | 'status'
    | 'notes';

export type PetCreateFieldErrors = Partial<Record<PetCreateFormFieldKey, string>>;

export interface ParsedPetCreateHttpError {
    fieldErrors: PetCreateFieldErrors;
    summaryMessage: string | null;
}

type ProblemBody = ProblemDetails & {
    errors?: Record<string, string[] | string | unknown> | null;
    validationErrors?: Record<string, string[] | string | unknown> | null;
};
const FIELD_MAP: Record<string, PetCreateFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    name: 'name',
    petname: 'name',
    species: 'speciesId',
    speciesid: 'speciesId',
    breed: 'breedId',
    breedid: 'breedId',
    gender: 'gender',
    birthdate: 'birthDate',
    birthdateutc: 'birthDate',
    color: 'color',
    weight: 'weightStr',
    status: 'status',
    durum: 'status',
    notes: 'notes',
    not: 'notes',
    notlar: 'notes'
};

function isLikelyMojibake(s: string): boolean {
    if (!s) {
        return false;
    }
    if (/do\?rulama|hatas\?|olu\?tu|do\uFFFD|hata\uFFFD/i.test(s)) {
        return true;
    }
    if (/bir veya daha fazla/i.test(s) && /\?/.test(s)) {
        return true;
    }
    return /\?[ğüşıöçĞÜŞİÖÇa-z]/i.test(s) || /[a-z]\?[a-z]{2,}/i.test(s);
}

function isGenericValidationTitle(s: string): boolean {
    return (
        /one or more validation errors occurred/i.test(s) ||
        /^validation failed/i.test(s.trim()) ||
        /^bad request$/i.test(s.trim())
    );
}

function resolveNonFieldErrorMessage(err: HttpErrorResponse): string {
    const status = err.status;
    const body = err.error as ProblemBody | string | null | undefined;

    if (status === 409) {
        return messageFromPetCreateHttpError(err);
    }

    if (typeof body === 'string') {
        const t = body.trim();
        if (t && !isLikelyMojibake(t)) {
            return t;
        }
        return FALLBACK_GENERIC;
    }

    if (body && typeof body === 'object') {
        const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
        if (detail && !isLikelyMojibake(detail) && !isGenericValidationTitle(detail)) {
            return detail;
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title && !isGenericValidationTitle(title) && !isLikelyMojibake(title)) {
            return title;
        }
    }

    if (status === 400 || status === 422) {
        return FALLBACK_GENERIC;
    }

    return messageFromPetCreateHttpError(err);
}

/**
 * Pet create HTTP hatasını alan bazlı + üst özet mesaja dönüştürür.
 */
export function parsePetCreateHttpError(err: HttpErrorResponse): ParsedPetCreateHttpError {
    return parseValidationHttpError<PetCreateFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: resolveNonFieldErrorMessage,
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
