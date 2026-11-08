import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ApiKeyListDto, CreatedApiKeyDto } from '@/app/entities/api-key/models/api-key.model';

/** Dış API anahtarları (TIER-009, `EXTERNAL_API_CONTRACT.md` §6); kiracı oturumdan gelir. */
@Injectable({ providedIn: 'root' })
export class ApiKeysService {
    private readonly api = inject(ApiClient);

    list(): Observable<ApiKeyListDto> {
        return this.api.get<ApiKeyListDto>(ApiEndpoints.apiKeys.list());
    }

    /** Dönen `plainTextKey` saklanmaz; çağıran yalnız ekranda bir kez gösterir. */
    create(name: string, scopes: readonly string[]): Observable<CreatedApiKeyDto> {
        return this.api.post<CreatedApiKeyDto>(ApiEndpoints.apiKeys.list(), { name, scopes });
    }

    revoke(id: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.apiKeys.revoke(id), null);
    }
}
