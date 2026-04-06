import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const PUBLIC_OWNER_SIGNUP_CODE_MESSAGES: Record<string, string> = {
    'Subscriptions.PlanCodeInvalid': 'Seçilen plan geçersiz. Basic, Pro veya Premium seçin.',
    'Users.DuplicateEmail': 'Bu e-posta adresi zaten kayıtlı.',
    'Tenants.DuplicateName': 'Bu kiracı adı zaten kullanılıyor.',
    'Clinics.DuplicateName': 'Bu klinik adı bu kiracıda zaten kullanılıyor.',
    'Auth.AdminClaimMissing': 'Yönetici yetkisi atanamadı. Lütfen destek ile iletişime geçin.'
};

/**
 * POST `/api/v1/public/owner-signup` — ProblemDetails `extensions.code` + FluentValidation `errors`.
 */
export function publicOwnerSignupFailureMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
        return err instanceof Error && err.message.trim() ? err.message.trim() : 'Kayıt tamamlanamadı.';
    }
    const problem = readProblemDetailsFromHttp(err);
    const code = problem?.code?.trim() ?? '';
    if (code && PUBLIC_OWNER_SIGNUP_CODE_MESSAGES[code]) {
        return PUBLIC_OWNER_SIGNUP_CODE_MESSAGES[code];
    }
    const fromValidation = firstValidationMessage(problem?.errors);
    if (fromValidation) {
        return fromValidation;
    }
    return messageFromHttpError(err, 'Kayıt tamamlanamadı.');
}

function readProblemDetailsFromHttp(err: HttpErrorResponse): ProblemDetails | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const ext =
        o['extensions'] && typeof o['extensions'] === 'object' && !Array.isArray(o['extensions'])
            ? (o['extensions'] as Record<string, unknown>)
            : null;

    const pickExtString = (key: string): string | null => {
        if (!ext) {
            return null;
        }
        const v = ext[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    };

    const codeFromExtensions = pickExtString('code');
    const code =
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        codeFromExtensions;

    return {
        type: typeof o['type'] === 'string' ? o['type'] : null,
        title: typeof o['title'] === 'string' ? o['title'] : null,
        status: typeof o['status'] === 'number' ? o['status'] : null,
        detail: typeof o['detail'] === 'string' ? o['detail'] : null,
        instance: typeof o['instance'] === 'string' ? o['instance'] : null,
        code: code ?? null,
        traceId: null,
        correlationId: null,
        timestampUtc: null,
        errors: (o['errors'] as ProblemDetails['errors']) ?? null
    };
}

function firstValidationMessage(errors: ProblemDetails['errors'] | null | undefined): string | null {
    if (!errors || typeof errors !== 'object') {
        return null;
    }
    for (const v of Object.values(errors)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string' && v[0].trim()) {
            return v[0].trim();
        }
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}
