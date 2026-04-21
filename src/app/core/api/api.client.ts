import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';

/**
 * İnce HTTP sarmalayıcı: base URL + path birleştirir.
 * İleride ortak hata eşlemesi veya trace id buraya eklenebilir.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL);

    get<T>(path: string, params?: HttpParams): Observable<T> {
        return this.http.get<T>(this.url(path), { params });
    }

    /** CSV / binary export — `Content-Disposition` ile dosya adı okunabilir. */
    getBlob(path: string, params?: HttpParams): Observable<HttpResponse<Blob>> {
        return this.http.get(this.url(path), {
            params,
            responseType: 'blob',
            observe: 'response'
        });
    }

    post<T>(path: string, body: unknown): Observable<T> {
        return this.http.post<T>(this.url(path), body);
    }

    put<T>(path: string, body: unknown): Observable<T> {
        return this.http.put<T>(this.url(path), body);
    }

    delete<T>(path: string): Observable<T> {
        return this.http.delete<T>(this.url(path));
    }

    private url(path: string): string {
        const base = this.baseUrl.replace(/\/$/, '');
        const p = path.startsWith('/') ? path : `/${path}`;
        return `${base}${p}`;
    }
}
