import type { AccountSummary } from '@/app/features/account/models/account-summary.model';

export const ACCOUNT_NOT_SELECTED_LABEL = 'Seçilmedi';
export const ACCOUNT_ROLES_EMPTY_LABEL = 'Rol bilgisi bulunamadı';
export const ACCOUNT_SUMMARY_LOAD_ERROR = 'Hesap bilgileri alınamadı.';

export function resolveAccountDisplayName(summary: Pick<AccountSummary, 'displayName' | 'email'>): string {
    const displayName = summary.displayName?.trim();
    return displayName || summary.email;
}

export function resolveAccountOptionalName(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed || ACCOUNT_NOT_SELECTED_LABEL;
}

export function resolveAccountScopeLabel(isTenantWide: boolean): string {
    return isTenantWide ? 'Tüm organizasyon' : 'Klinik bazlı';
}

/** Profil avatarı için en fazla iki harf (displayName veya e-postadan). */
export function resolveAccountAvatarInitials(summary: Pick<AccountSummary, 'displayName' | 'email'>): string {
    const name = resolveAccountDisplayName(summary);
    const parts = name.split(/[\s._@-]+/).filter(Boolean);

    if (parts.length >= 2) {
        const first = parts[0]?.[0] ?? '';
        const second = parts[1]?.[0] ?? '';
        const initials = `${first}${second}`.trim();
        if (initials) {
            return initials.toUpperCase();
        }
    }

    const single = parts[0] ?? name;
    if (single.length >= 2) {
        return single.slice(0, 2).toUpperCase();
    }

    return (single[0] ?? '?').toUpperCase();
}
