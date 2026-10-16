import { HttpParams } from '@angular/common/http';

/** Sayfalı yanıt zarfı (sözleşme §6.4, §6.5). */
export interface PortalPage<T> {
    readonly items: readonly T[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
}

/** Portal listelerinde sayfa boyu; sözleşme 1–50 arası kabul eder, varsayılanı 20. */
export const PORTAL_PAGE_SIZE = 20;

export function portalPageParams(page: number, pageSize = PORTAL_PAGE_SIZE): HttpParams {
    return new HttpParams().set('page', page).set('pageSize', pageSize);
}

/** Sonraki sayfa var mı (sunucunun `totalPages` değerine göre). */
export function hasNextPortalPage(page: PortalPage<unknown> | null): boolean {
    return page !== null && page.page < page.totalPages;
}
