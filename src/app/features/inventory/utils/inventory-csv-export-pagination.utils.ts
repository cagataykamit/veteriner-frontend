import { concatMap, from, map, type Observable, of, reduce, switchMap, throwError } from 'rxjs';

/** Backend listeleri pageSize’ı tipik olarak 1–200 aralığında clamp eder; export isteği bu tavanla hizalanır. */
export const INVENTORY_CSV_EXPORT_PAGE_SIZE_REQUEST = 200;

export const INVENTORY_CSV_EXPORT_MAX_ROWS = 10_000;

export class InventoryCsvExportRowLimitError extends Error {
    override readonly name = 'InventoryCsvExportRowLimitError';

    constructor() {
        super('INVENTORY_CSV_EXPORT_ROW_LIMIT_EXCEEDED');
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export interface InventoryCsvExportPagedResult<T> {
    readonly items: T[];
    readonly pageSize: number;
    readonly totalItems: number;
}

/**
 * İlk sayfadan gelen `pageSize` ile toplam sayfa sayısını hesaplar; kalan sayfaları sırayla çeker.
 * Paralel forkJoin yerine concatMap kullanır (pilot güvenliği).
 */
export function fetchAllInventoryCsvExportPages$<T>(
    fetchPage: (page: number, pageSize: number) => Observable<InventoryCsvExportPagedResult<T>>
): Observable<T[]> {
    const requestedSize = INVENTORY_CSV_EXPORT_PAGE_SIZE_REQUEST;
    return fetchPage(1, requestedSize).pipe(
        switchMap((first) => {
            const effectivePageSize =
                Number.isFinite(first.pageSize) && first.pageSize > 0
                    ? first.pageSize
                    : INVENTORY_CSV_EXPORT_PAGE_SIZE_REQUEST;
            if (first.totalItems > INVENTORY_CSV_EXPORT_MAX_ROWS) {
                return throwError(() => new InventoryCsvExportRowLimitError());
            }
            if (first.totalItems === 0) {
                return of([]);
            }
            const totalPages = Math.max(1, Math.ceil(first.totalItems / effectivePageSize));
            const collected: T[] = [...first.items];
            if (totalPages <= 1) {
                return of(collected.slice(0, first.totalItems));
            }
            const restPageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
            return from(restPageNumbers).pipe(
                concatMap((page) => fetchPage(page, effectivePageSize)),
                map((pageRes) => pageRes.items),
                reduce((acc: T[], chunk: T[]) => {
                    acc.push(...chunk);
                    return acc;
                }, collected),
                map((all) => all.slice(0, first.totalItems))
            );
        })
    );
}
