import { DestroyRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { PORTAL_NETWORK_ERROR_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { page } from '@portal/app/testing/portal-fixtures';
import { PortalLoad, PortalPagedLoad } from './portal-load';

function destroyRef(): DestroyRef & { destroy(): void } {
    const callbacks: (() => void)[] = [];

    return {
        destroyed: false,
        onDestroy: (cb: () => void) => {
            callbacks.push(cb);

            return () => undefined;
        },
        destroy: () => callbacks.forEach((cb) => cb())
    } as unknown as DestroyRef & { destroy(): void };
}

describe('PortalLoad / PortalPagedLoad', () => {
    it('yükleniyor → hazır; hata mesajı kullanıcı metnidir ve tekrar dene aynı kaynağı çağırır', () => {
        const load = new PortalLoad<number>(destroyRef());
        let calls = 0;

        const source = () => {
            calls++;

            return calls === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(42);
        };

        load.run(source);
        expect(load.state()).toBe('error');
        expect(load.error()).toBe(PORTAL_NETWORK_ERROR_MESSAGE);

        load.retry();
        expect(load.state()).toBe('ready');
        expect(load.data()).toBe(42);
    });

    it('yeni run önceki isteği iptal eder; yok olunca abonelik kapanır', () => {
        const ref = destroyRef();
        const load = new PortalLoad<number>(ref);
        const first = new Subject<number>();
        const second = new Subject<number>();

        load.run(() => first);
        load.run(() => second);
        first.next(1);
        expect(load.data()).toBeNull();

        ref.destroy();
        expect(second.observed).toBeFalse();
    });

    it('sayfalama: sonraki sayfa eklenir, son sayfada daha fazla yoktur', () => {
        const load = new PortalPagedLoad<string>(destroyRef());
        const pages = [page(['a', 'b'], 1, 2, 3), page(['c'], 2, 2, 3)];
        const requested: number[] = [];

        load.run((p) => {
            requested.push(p);

            return of(pages[p - 1]);
        });
        expect(load.items()).toEqual(['a', 'b']);
        expect(load.hasMore()).toBeTrue();

        load.loadMore();
        expect(requested).toEqual([1, 2]);
        expect(load.items()).toEqual(['a', 'b', 'c']);
        expect(load.hasMore()).toBeFalse();
    });

    it('sonraki sayfa hatası yüklenen satırları silmez; tekrar dene aynı sayfayı ister', () => {
        const load = new PortalPagedLoad<string>(destroyRef());
        let failNext = true;
        const requested: number[] = [];

        load.run((p) => {
            requested.push(p);

            if (p === 2 && failNext) {
                failNext = false;

                return throwError(() => new HttpErrorResponse({ status: 500 }));
            }

            return of(page(p === 1 ? ['a'] : ['b'], p, 2, 2));
        });
        load.loadMore();

        expect(load.state()).toBe('ready');
        expect(load.moreState()).toBe('error');
        expect(load.items()).toEqual(['a']);

        load.retry();
        expect(requested).toEqual([1, 2, 2]);
        expect(load.items()).toEqual(['a', 'b']);
    });
});
