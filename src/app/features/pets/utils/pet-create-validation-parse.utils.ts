import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromPetCreateHttpError } from '@/app/features/pets/utils/pet-create-error.utils';

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

function extractRawValidationErrors(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const raw = o['errors'] ?? o['validationErrors'];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    return raw as Record<string, unknown>;
}

function firstStringMessage(v: unknown): string | null {
    if (typeof v === 'string' && v.trim()) {
        return v.trim();
    }
    if (Array.isArray(v)) {
        for (const item of v) {
            if (typeof item === 'string' && item.trim()) {
                return item.trim();
            }
        }
    }
    return null;
}

/** API alan adı → form kontrolü (`ownerId` → `clientId`, `birthDateUtc` → `birthDate`). */
function mapApiFieldKeyToFormField(rawKey: string): PetCreateFormFieldKey | null {
    const key = rawKey
        .replace(/^\$/, '')
        .replace(/\[\d+]$/, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');

    const map: Record<string, PetCreateFormFieldKey> = {
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
    return map[key] ?? null;
}

function extractFieldErrorsFromBody(body: unknown): PetCreateFieldErrors {
    const out: PetCreateFieldErrors = {};
    const raw = extractRawValidationErrors(body);
    if (!raw) {
        return out;
    }

    for (const [apiKey, val] of Object.entries(raw)) {
        const formKey = mapApiFieldKeyToFormField(apiKey);
        if (!formKey) {
            continue;
        }
        const msg = firstStringMessage(val);
        if (!msg) {
            continue;
        }
        if (!out[formKey]) {
            out[formKey] = msg;
        }
    }
    return out;
}

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
    const fieldErrors = extractFieldErrorsFromBody(err.error);

    if (Object.keys(fieldErrors).length > 0) {
        return {
            fieldErrors,
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return {
        fieldErrors: {},
        summaryMessage: resolveNonFieldErrorMessage(err)
    };
}
