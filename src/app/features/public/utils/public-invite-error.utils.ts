import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const INVITE_CODE_MESSAGES: Record<string, string> = {
    'Subscriptions.UserLimitExceeded': 'Bu işletme için kullanıcı kotası doldu. Yöneticinizle iletişime geçin.',
    'Invites.DuplicatePending': 'Bu e-posta için zaten bekleyen bir davet var.',
    'Invites.RequiresLogin': 'Bu daveti kabul etmek için önce giriş yapmalısınız.',
    'Invites.UserBelongsToAnotherTenant': 'Hesabınız başka bir işletmeye bağlı; bu daveti bu hesapla kabul edemezsiniz.',
    'Invites.Expired': 'Davet süresi dolmuş.',
    'Invites.InvalidToken': 'Davet bağlantısı geçersiz veya bulunamadı.',
    'Invites.NotFound': 'Davet bulunamadı.',
    'Invites.AlreadyAccepted': 'Bu davet daha önce kabul edilmiş.',
    'Invites.CannotJoin': 'Bu davetle şu anda katılım mümkün değil.',
    'Invites.EmailMismatch': 'Giriş yaptığınız hesap bu davetin e-posta adresiyle eşleşmiyor.'
};

function readProblemFromHttp(err: HttpErrorResponse): ProblemDetails | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const ext =
        o['extensions'] && typeof o['extensions'] === 'object' && !Array.isArray(o['extensions'])
            ? (o['extensions'] as Record<string, unknown>)
            : null;
    const pickExt = (key: string): string | null => {
        if (!ext) {
            return null;
        }
        const v = ext[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    };
    const code =
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        pickExt('code');
    return {
        code: code ?? null,
        detail: typeof o['detail'] === 'string' ? o['detail'] : null,
        title: typeof o['title'] === 'string' ? o['title'] : null,
        errors: (o['errors'] as ProblemDetails['errors']) ?? null
    };
}

function firstValidationMessage(errors: ProblemDetails['errors'] | null | undefined): string | null {
    if (!errors || typeof errors !== 'object') {
        return null;
    }
    for (const v of Object.values(errors)) {
        if (Array.isArray(v) && v[0] && typeof v[0] === 'string' && v[0].trim()) {
            return v[0].trim();
        }
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

export function publicInviteFailureMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) {
        return err instanceof Error && err.message.trim() ? err.message.trim() : fallback;
    }
    const p = readProblemFromHttp(err);
    const code = p?.code?.trim() ?? '';
    if (code && INVITE_CODE_MESSAGES[code]) {
        return INVITE_CODE_MESSAGES[code];
    }
    const v = firstValidationMessage(p?.errors);
    if (v) {
        return v;
    }
    return messageFromHttpError(err, fallback);
}
