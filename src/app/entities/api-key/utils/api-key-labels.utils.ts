import type { ApiKeyScope } from '@/app/entities/api-key/models/api-key.model';

const SCOPE_LABELS: Readonly<Record<ApiKeyScope, string>> = {
    'clients:read': 'Müşteriler',
    'pets:read': 'Hayvanlar',
    'appointments:read': 'Randevular',
    'vaccinations:read': 'Aşılar'
};

/** Kapsamın ekrandaki adı; sunucu yeni kapsam eklerse kodun kendisi görünür. */
export function apiKeyScopeLabel(scope: string): string {
    return SCOPE_LABELS[scope as ApiKeyScope] ?? scope;
}

/** Listede anahtarı tanımak için: yalnız ön ek, gizli kısım hiç gösterilmez (sunucuda da yok). */
export function maskedApiKey(prefix: string): string {
    return `${prefix}_••••••••`;
}
