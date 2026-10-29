import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** Portal API kökü (`environment.portalApiBaseUrl`, ör. `/api/portal/v1`). Klinik panelinin `API_BASE_URL`'inden ayrıdır. */
export const PORTAL_API_BASE_URL = new InjectionToken<string>('PORTAL_API_BASE_URL');

/** Kök + göreli yol birleştirme; interceptor da aynı kuralla portal isteğini tanır (tek yer). */
export function portalApiUrl(baseUrl: string, path: string): string {
    const base = baseUrl.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '');

    return `${base}/${p}`;
}

/** İsteğin portal API'sine gidip gitmediği; değilse göreli yolu `null` döner. */
export function portalApiRelativePath(baseUrl: string, url: string): string | null {
    const prefix = `${baseUrl.replace(/\/+$/, '')}/`;

    if (!url.startsWith(prefix)) {
        return null;
    }

    return url.slice(prefix.length).split('?')[0];
}

/** İnce HTTP sarmalayıcı: yalnız portal API'sine istek atar. */
@Injectable({ providedIn: 'root' })
export class PortalApiClient {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(PORTAL_API_BASE_URL);

    get<T>(path: string, params?: HttpParams): Observable<T> {
        return this.http.get<T>(portalApiUrl(this.baseUrl, path), { params });
    }

    post<T>(path: string, body: unknown = {}): Observable<T> {
        return this.http.post<T>(portalApiUrl(this.baseUrl, path), body);
    }

    put<T>(path: string, body: unknown = {}): Observable<T> {
        return this.http.put<T>(portalApiUrl(this.baseUrl, path), body);
    }

    delete<T>(path: string, body?: unknown): Observable<T> {
        return this.http.delete<T>(portalApiUrl(this.baseUrl, path), { body });
    }
}
