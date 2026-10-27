import { type Observable, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { ListPageState, type ListPageConfig, type ListPageResult } from './list-page-state';

const KEY = 'test.list.state';

describe('ListPageState', () => {
    let search: string;
    let fetch: Mock<(page: number, pageSize: number) => Observable<ListPageResult<string>>>;

    const result = (page: number, pageSize: number): ListPageResult<string> => ({ items: [`s${page}`], totalItems: 40, page, pageSize });

    const create = (over: Partial<ListPageConfig<string>> = {}) =>
        new ListPageState<string>({
            fetch,
            loadKey: (page, pageSize) => `${page}|${pageSize}|${search}`,
            persist: { key: KEY, save: () => ({ search }), restore: (s) => (search = typeof s['search'] === 'string' ? s['search'] : '') },
            ...over
        });

    beforeEach(() => {
        sessionStorage.removeItem(KEY);
        search = '';
        fetch = vi.fn((page: number, pageSize: number) => of(result(page, pageSize)));
    });

    afterEach(() => sessionStorage.removeItem(KEY));

    it('ilk yükleme: sonuç uygulanır, konum saklanır, tablonun açılış olayı yutulur', () => {
        const list = create();

        expect(list.loading()).toBe(true);
        list.startInitialLoad();

        expect(fetch).toHaveBeenCalledWith(1, 10);
        expect(list.items()).toEqual(['s1']);
        expect(list.totalItems()).toBe(40);
        expect(list.loading()).toBe(false);
        expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ search: '', page: 1, pageSize: 10 });

        list.onTableLazyLoad({ first: 0, rows: 10 });
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('tablo sayfa değişimi yükler; aynı istek tekrarlanmaz, reload zorlar', () => {
        const list = create();

        list.startInitialLoad();
        list.onTableLazyLoad({ first: 0, rows: 10 });
        list.onTableLazyLoad({ first: 20, rows: 10 });

        expect(fetch).toHaveBeenLastCalledWith(3, 10);
        expect(list.first()).toBe(20);
        expect(list.currentPage()).toBe(3);

        list.onTableLazyLoad({ first: 20, rows: 10 });
        expect(fetch).toHaveBeenCalledTimes(2);

        list.reload();
        expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('saklanan listede sayfa boyutu değişince ilk sayfaya dönülür', () => {
        const list = create();

        list.startInitialLoad();
        list.onTableLazyLoad({ first: 0, rows: 10 });
        list.onTableLazyLoad({ first: 30, rows: 25 });

        expect(fetch).toHaveBeenLastCalledWith(1, 25);
    });

    it('saklanmayan listede sayfa tablo olayından hesaplanır', () => {
        const list = create({ persist: undefined });

        list.startInitialLoad();
        list.onTableLazyLoad({ first: 0, rows: 10 });
        list.onTableLazyLoad({ first: 50, rows: 25 });

        expect(fetch).toHaveBeenLastCalledWith(3, 25);
        expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('mobil sayfalayıcı yükler ve tablonun ardından gelen olayını yutar', () => {
        const list = create();

        list.startInitialLoad();
        list.onTableLazyLoad({ first: 0, rows: 10 });
        list.onMobilePageChange({ first: 10, rows: 10 });

        expect(fetch).toHaveBeenLastCalledWith(2, 10);

        list.onTableLazyLoad({ first: 10, rows: 10 });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('süzgeç uygulanınca ilk sayfa; temizlenince saklanan konum silinip ilk sayfa yüklenir', () => {
        const list = create();

        list.startInitialLoad();
        list.onTableLazyLoad({ first: 0, rows: 10 });
        list.onTableLazyLoad({ first: 20, rows: 10 });
        search = 'rex';
        list.loadFirstPage();

        expect(fetch).toHaveBeenLastCalledWith(1, 10);
        expect(JSON.parse(sessionStorage.getItem(KEY)!)['search']).toBe('rex');

        const remove = vi.spyOn(Storage.prototype, 'removeItem');

        search = '';
        list.resetToFirstPage();

        expect(remove).toHaveBeenCalledWith(KEY);
        expect(fetch).toHaveBeenLastCalledWith(1, 10);
    });

    it('geri yükleme: geçerli kayıt süzgeç ve konumu uygular, bozuk kayıt silinir', () => {
        sessionStorage.setItem(KEY, JSON.stringify({ search: 'kedi', page: 3, pageSize: 25 }));
        const list = create();

        expect(list.restore()).toBe(true);
        expect(search).toBe('kedi');
        expect(list.currentPage()).toBe(3);
        expect(list.first()).toBe(50);
        expect(list.pageSize()).toBe(25);

        sessionStorage.setItem(KEY, JSON.stringify({ page: 0, pageSize: 10 }));
        expect(create().restore()).toBe(false);
        expect(sessionStorage.getItem(KEY)).toBeNull();

        sessionStorage.setItem(KEY, '{bozuk');
        expect(create().restore()).toBe(false);
        expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it('hata metni ve yükleme durumu', () => {
        fetch.mockReturnValue(throwError(() => new Error('Sunucu hatası')));
        const list = create();

        list.startInitialLoad();

        expect(list.error()).toBe('Sunucu hatası');
        expect(list.loading()).toBe(false);

        const custom = create({ errorMessage: () => 'Liste yüklenemedi.' });

        custom.startInitialLoad();
        expect(custom.error()).toBe('Liste yüklenemedi.');
    });

    it('varsayılan ve özel sayfa boyutu; onLoaded kancası', () => {
        const onLoaded = vi.fn();
        const list = create({ pageSize: 20, rowsPerPageOptions: [20, 50], onLoaded });

        expect(list.pageSize()).toBe(20);
        expect(list.rowsPerPageOptions).toEqual([20, 50]);
        list.startInitialLoad();
        expect(onLoaded).toHaveBeenCalledWith(result(1, 20));
        expect(create().rowsPerPageOptions).toEqual([10, 20, 25, 50]);
    });
});
