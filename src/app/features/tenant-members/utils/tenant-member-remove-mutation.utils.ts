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

const MEMBER_REMOVE_MESSAGES: Record<string, string> = {
    'TenantMembers.NotFound': 'Kullanıcı bulunamadı.',
    TenantMembersNotFound: 'Kullanıcı bulunamadı.',
    'TenantMembers.CannotRemoveSelf': 'Kendi üyeliğinizi çıkaramazsınız.',
    TenantMembersCannotRemoveSelf: 'Kendi üyeliğinizi çıkaramazsınız.',
    'TenantMembers.CannotRemoveLastAdmin': 'Son yönetici çıkarılamaz.',
    TenantMembersCannotRemoveLastAdmin: 'Son yönetici çıkarılamaz.',
    'TenantMembers.CannotRemoveLastMember': 'Kurumdaki son üye çıkarılamaz.',
    TenantMembersCannotRemoveLastMember: 'Kurumdaki son üye çıkarılamaz.',
    'TenantMembers.RemoveFailed': 'Üye çıkarılamadı. Lütfen tekrar deneyin.',
    TenantMembersRemoveFailed: 'Üye çıkarılamadı. Lütfen tekrar deneyin.',
    'TenantSubscription.ReadOnly': 'Kurum salt okunur durumda olduğu için işlem yapılamaz.',
    TenantSubscriptionReadOnly: 'Kurum salt okunur durumda olduğu için işlem yapılamaz.',
    'Subscriptions.TenantReadOnly': 'Kurum salt okunur durumda olduğu için işlem yapılamaz.',
    SubscriptionsTenantReadOnly: 'Kurum salt okunur durumda olduğu için işlem yapılamaz.',
    'Auth.Forbidden': 'Bu işlem için yetkiniz yok.',
    AuthForbidden: 'Bu işlem için yetkiniz yok.',
    Forbidden: 'Bu işlem için yetkiniz yok.'
};

/** Kiracı üyesini kurumdan çıkarma hatalarını kullanıcı mesajına çevirir. */
export function memberRemoveMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = MEMBER_REMOVE_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const normalized = code.replace(/\./g, '');
        const fuzzy = MEMBER_REMOVE_MESSAGES[normalized];
        if (fuzzy) {
            return fuzzy;
        }
    }
    return messageFromHttpError(err, fallback);
}
