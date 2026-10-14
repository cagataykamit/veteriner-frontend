import type { ActivatedRoute } from '@angular/router';

/** Detay sayfalarındaki "Tümü →" bağlantılarının taşıdığı `petId` / `clientId` sorgu parametresi. */
export function readContextFilterParam(route: ActivatedRoute, key: 'petId' | 'clientId'): string {
    return route.snapshot.queryParamMap.get(key)?.trim() ?? '';
}

/** Süzgeç kaldırılınca adres çubuğundaki parametreleri de temizler. */
export const CLEAR_CONTEXT_FILTER_QUERY = { petId: null, clientId: null } as const;
