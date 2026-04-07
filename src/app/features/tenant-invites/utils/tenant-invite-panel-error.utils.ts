import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const PANEL_INVITE_CODE_MESSAGES: Record<string, string> = {
    'Subscriptions.UserLimitExceeded': 'Kullanıcı kotası doldu; yeni davet oluşturulamıyor.',
    'Invites.DuplicatePending': 'Bu e-posta için zaten bekleyen bir davet var.',
    'Tenants.TenantInactive': 'Kiracı hesabı aktif değil.',
    'Tenants.NotFound': 'Kiracı bulunamadı veya erişilemiyor.',
    'Clinics.NotFound': 'Seçilen klinik bulunamadı.',
    'Clinics.ClinicNotInTenant': 'Seçilen klinik bu kiracıya ait değil.',
    'Invites.InvalidOperationClaim': 'Seçilen rol bu davet için geçersiz.',
    'Invites.Forbidden': 'Davet oluşturma yetkiniz yok.',
    'Auth.Forbidden': 'Bu işlem için yetkiniz yok.'
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

export function tenantInvitePanelFailureMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) {
        return err instanceof Error && err.message.trim() ? err.message.trim() : fallback;
    }
    if (err.status === 403) {
        const p = readProblemFromHttp(err);
        const code = p?.code?.trim() ?? '';
        if (code && PANEL_INVITE_CODE_MESSAGES[code]) {
            return PANEL_INVITE_CODE_MESSAGES[code];
        }
        return 'Bu işlem için yetkiniz yok.';
    }
    const p = readProblemFromHttp(err);
    const code = p?.code?.trim() ?? '';
    if (code && PANEL_INVITE_CODE_MESSAGES[code]) {
        return PANEL_INVITE_CODE_MESSAGES[code];
    }
    const v = firstValidationMessage(p?.errors);
    if (v) {
        return v;
    }
    return messageFromHttpError(err, fallback);
}
