import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

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

export function parseBreedUpsertHttpError(err: HttpErrorResponse): ParsedBreedUpsertHttpError {
    const fieldErrors = extractFieldErrorsFromBody(err.error);
    if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors, summaryMessage: SUMMARY_FIELD_ERRORS };
    }
    return {
        fieldErrors: {},
        summaryMessage: resolveNonFieldErrorMessage(err)
    };
}

function extractFieldErrorsFromBody(body: unknown): BreedUpsertFieldErrors {
    const out: BreedUpsertFieldErrors = {};
    const raw = extractRawValidationErrors(body);
    if (!raw) {
        return out;
    }
    for (const [apiKey, val] of Object.entries(raw)) {
        const formKey = mapApiFieldKeyToFormField(apiKey);
        if (!formKey || out[formKey]) {
            continue;
        }
        const msg = firstStringMessage(val);
        if (msg) {
            out[formKey] = msg;
        }
    }
    return out;
}

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

function mapApiFieldKeyToFormField(rawKey: string): BreedUpsertFormFieldKey | null {
    const key = rawKey
        .replace(/^\$/, '')
        .replace(/\[\d+]$/, '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
    const map: Record<string, BreedUpsertFormFieldKey> = {
        speciesid: 'speciesId',
        code: 'code',
        name: 'name',
        isactive: 'isActive',
        active: 'isActive',
        displayorder: 'displayOrder',
        order: 'displayOrder'
    };
    return map[key] ?? null;
}

function resolveNonFieldErrorMessage(err: HttpErrorResponse): string {
    const body = err.error as ProblemBody | string | null | undefined;
    if (typeof body === 'string' && body.trim()) {
        return body.trim();
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
