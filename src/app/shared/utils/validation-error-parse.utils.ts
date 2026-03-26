import { HttpErrorResponse } from '@angular/common/http';

export const DEFAULT_VALIDATION_SUMMARY_MESSAGE = 'Lütfen hatalı alanları düzeltin.';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface ParseValidationFieldErrorsOptions<K extends string> {
    fieldMap: Record<string, K>;
    normalizeMessage?: (field: K, message: string) => string;
}

export function extractRawValidationErrors(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;

    const candidates: unknown[] = [o['errors'], o['error'], o['validationErrors']];
    for (const c of candidates) {
        if (c && typeof c === 'object' && !Array.isArray(c)) {
            return c as Record<string, unknown>;
        }
    }
    return null;
}

export function firstStringMessage(v: unknown): string | null {
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

export function normalizeApiFieldKey(rawKey: string): string {
    return rawKey
        .replace(/^\$/, '')
        .replace(/\[\d+]$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

export function parseValidationFieldErrors<K extends string>(
    body: unknown,
    options: ParseValidationFieldErrorsOptions<K>
): FieldErrors<K> {
    const out: FieldErrors<K> = {};
    const raw = extractRawValidationErrors(body);
    if (!raw) {
        return out;
    }

    for (const [apiKey, val] of Object.entries(raw)) {
        const normalizedKey = normalizeApiFieldKey(apiKey);
        const formKey = options.fieldMap[normalizedKey];
        if (!formKey || out[formKey]) {
            continue;
        }
        const msg = firstStringMessage(val);
        if (!msg) {
            continue;
        }
        out[formKey] = options.normalizeMessage ? options.normalizeMessage(formKey, msg) : msg;
    }
    return out;
}

export function parseValidationHttpError<K extends string>(
    err: HttpErrorResponse,
    options: {
        fieldMap: Record<string, K>;
        nonFieldMessage: (err: HttpErrorResponse) => string;
        normalizeMessage?: (field: K, message: string) => string;
        fieldErrorsSummaryMessage?: string;
    }
): {
    fieldErrors: FieldErrors<K>;
    summaryMessage: string | null;
} {
    const fieldErrors = parseValidationFieldErrors<K>(err.error, {
        fieldMap: options.fieldMap,
        normalizeMessage: options.normalizeMessage
    });
    if (Object.keys(fieldErrors).length > 0) {
        return {
            fieldErrors,
            summaryMessage: options.fieldErrorsSummaryMessage ?? DEFAULT_VALIDATION_SUMMARY_MESSAGE
        };
    }
    return {
        fieldErrors: {},
        summaryMessage: options.nonFieldMessage(err)
    };
}
