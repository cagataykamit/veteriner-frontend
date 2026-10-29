import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';

/** `GET /reports/favorites` satırı (REPORT_PREFERENCES_API_CONTRACT.md §2). */
export interface ReportFavoriteDto {
    readonly reportKey: string;
    readonly createdAtUtc: string;
}

/**
 * Raporun kararlı anahtarı, adresinden türer (sözleşme §1): `/panel/reports/` sonrası, `/` → `.`
 * (`/panel/reports/registers/examinations?x=1` → `registers.examinations`). Rapor Merkezi dışı adres için `null`.
 */
export function reportKeyFromRoute(route: string): string | null {
    const path = route.split(/[?#]/)[0].replace(/\/+$/, '');
    const prefix = `${REPORTS_ROUTE}/`;

    if (!path.startsWith(prefix)) {
        return null;
    }

    const key = path.slice(prefix.length).replaceAll('/', '.');

    return /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(key) ? key : null;
}

/** Kullanıcıya özel rapor tercihleri: favoriler (kiracı + kullanıcı kapsamı backend'de). */
@Injectable({ providedIn: 'root' })
export class ReportPreferencesService {
    private readonly api = inject(ApiClient);

    listFavoriteKeys(): Observable<string[]> {
        return this.api.get<ReportFavoriteDto[]>(ApiEndpoints.reports.favorites()).pipe(map((rows) => rows.map((r) => r.reportKey)));
    }

    addFavorite(reportKey: string): Observable<void> {
        return this.api.put<void>(ApiEndpoints.reports.favorite(reportKey), null);
    }

    removeFavorite(reportKey: string): Observable<void> {
        return this.api.delete<void>(ApiEndpoints.reports.favorite(reportKey));
    }
}
