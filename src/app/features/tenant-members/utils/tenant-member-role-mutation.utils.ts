import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

function extractProblemCode(err: HttpErrorResponse): string | null {
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
    return (
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        pickExt('code') ||
        pickExt('Code')
    );
}

const MEMBER_ROLE_MESSAGES: Record<string, string> = {
    'Invites.SelfRoleRemoveForbidden': 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    InvitesSelfRoleRemoveForbidden: 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    'Members.SelfRemoveForbidden': 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    MembersSelfRemoveForbidden: 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    'TenantMembers.SelfRemoveForbidden': 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    'Auth.SelfRemoveForbidden': 'Kendi rolünüzü bu ekrandan kaldıramazsınız.',
    'Invites.OperationClaimNotFound': 'Seçilen rol veya yetki bulunamadı.',
    InvitesOperationClaimNotFound: 'Seçilen rol veya yetki bulunamadı.',
    'Invites.OperationClaimNotAssignable': 'Bu rol bu üyeye atanamaz (whitelist veya yetki kapsamı dışında).',
    InvitesOperationClaimNotAssignable: 'Bu rol bu üyeye atanamaz (whitelist veya yetki kapsamı dışında).',
    'Members.NotFound': 'Üye bulunamadı.',
    MembersNotFound: 'Üye bulunamadı.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok.',
    AuthPermissionDenied: 'Bu işlem için yetkiniz yok.',
    'Subscriptions.TenantReadOnly':
        'Bu işletme salt okunur moddadır; yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    SubscriptionsTenantReadOnly:
        'Bu işletme salt okunur moddadır; yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    'Subscriptions.TenantCancelled':
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.',
    SubscriptionsTenantCancelled:
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.',
    'Members.ClaimAlreadyAssigned': 'Bu rol bu üyeye zaten atanmış.',
    'TenantMembers.ClaimAlreadyAssigned': 'Bu rol bu üyeye zaten atanmış.',
    'Members.AlreadyAssigned': 'Bu rol bu üyeye zaten atanmış.',
    'Members.ClaimAlreadyRemoved': 'Bu rol zaten kaldırılmış.',
    'TenantMembers.ClaimAlreadyRemoved': 'Bu rol zaten kaldırılmış.',
    'Members.AlreadyRemoved': 'Bu rol zaten kaldırılmış.',
    'TenantMembers.AlreadyRemoved': 'Bu rol zaten kaldırılmış.'
};

/** Üye rolü atama / kaldırma — ProblemDetails `code` ve genel HTTP mesajı. */
export function memberRoleAssignRemoveMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = MEMBER_ROLE_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const norm = code.replace(/\./g, '');
        const fuzzy = MEMBER_ROLE_MESSAGES[norm];
        if (fuzzy) {
            return fuzzy;
        }
    }
    return messageFromHttpError(err, fallback);
}

export function isMemberRoleAlreadyAssignedConflict(err: HttpErrorResponse): boolean {
    if (err.status !== 409 && err.status !== 400) {
        return false;
    }
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    if (!code) {
        return false;
    }
    return (
        code.includes('alreadyassigned') ||
        code.includes('already_assigned') ||
        code.includes('duplicate') ||
        code.includes('exists')
    );
}

export function isMemberRoleAlreadyRemoved(err: HttpErrorResponse): boolean {
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    return code.includes('alreadyremoved') || code.includes('already_removed') || code.includes('notfound');
}
