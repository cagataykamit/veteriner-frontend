import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject, NEVER, Observable, of, throwError } from 'rxjs';
import { RouteEntityLoader, type RouteEntityLoaderConfig } from './route-entity-loader';

describe('RouteEntityLoader', () => {
    let params: BehaviorSubject<ParamMap>;

    const create = <T>(config: RouteEntityLoaderConfig<T>) => {
        TestBed.configureTestingModule({ providers: [{ provide: ActivatedRoute, useValue: { paramMap: params } }] });

        return TestBed.runInInjectionContext(() => new RouteEntityLoader(config));
    };

    beforeEach(() => {
        params = new BehaviorSubject(convertToParamMap({ id: 'a' }));
    });

    it('rota kimliğiyle getirir; değer, loading ve kanca', () => {
        const onLoaded = vi.fn();
        const fetch = vi.fn((id: string) => of(`kayıt-${id}`));
        const loader = create({ fetch, invalidIdMessage: 'Geçersiz.', onLoaded });

        expect(loader.loading()).toBe(true);
        loader.init();

        expect(fetch).toHaveBeenCalledWith('a');
        expect(loader.value()).toBe('kayıt-a');
        expect(loader.loading()).toBe(false);
        expect(loader.error()).toBeNull();
        expect(loader.id).toBe('a');
        expect(onLoaded).toHaveBeenCalledWith('kayıt-a', 'a');
    });

    it('kimlik yoksa geçersiz kimlik hatası, istek atılmaz', () => {
        params.next(convertToParamMap({}));
        const fetch = vi.fn(() => of(1));
        const onRouteChange = vi.fn();
        const loader = create({ fetch, invalidIdMessage: 'Geçersiz ürün.', onRouteChange });

        loader.init();

        expect(fetch).not.toHaveBeenCalled();
        expect(loader.error()).toBe('Geçersiz ürün.');
        expect(loader.loading()).toBe(false);
        expect(onRouteChange).toHaveBeenCalledWith(null);
        expect(loader.id).toBeNull();
    });

    it('hata metni varsayılanı ve özel eşleme; hata kancası', () => {
        const onError = vi.fn();
        const loader = create({ fetch: () => throwError(() => new Error('Sunucu hatası')), invalidIdMessage: 'x', onError });

        loader.init();

        expect(loader.error()).toBe('Sunucu hatası');
        expect(loader.loading()).toBe(false);
        expect(onError).toHaveBeenCalled();

        TestBed.resetTestingModule();
        const mapped = create({ fetch: () => throwError(() => ({})), invalidIdMessage: 'x', errorMessage: () => 'Kayıt yüklenemedi.' });

        mapped.init();
        expect(mapped.error()).toBe('Kayıt yüklenemedi.');
    });

    it('hatadan sonra rota kimliği değişince yeniden yükler', () => {
        const fetch = vi.fn((id: string): Observable<string> => (id === 'a' ? throwError(() => new Error('yok')) : of(id)));
        const loader = create({ fetch, invalidIdMessage: 'x' });

        loader.init();
        expect(loader.error()).toBe('yok');

        params.next(convertToParamMap({ id: 'b' }));

        expect(loader.error()).toBeNull();
        expect(loader.value()).toBe('b');
    });

    it('rota değişince önceki istek iptal edilir; onRouteChange her yayında', () => {
        const onRouteChange = vi.fn();
        const fetch = vi.fn((id: string): Observable<string> => (id === 'a' ? NEVER : of(id)));
        const loader = create({ fetch, invalidIdMessage: 'x', onRouteChange });

        loader.init();
        expect(loader.loading()).toBe(true);

        params.next(convertToParamMap({ id: 'b' }));

        expect(onRouteChange.mock.calls).toEqual([['a'], ['b']]);
        expect(loader.value()).toBe('b');
        expect(loader.loading()).toBe(false);
    });

    it('reload aynı kimlikle yeniden getirir, onReload kancası; kimlik yoksa bir şey yapmaz', () => {
        const onReload = vi.fn();
        let n = 0;
        const loader = create({ fetch: (id: string) => of(`${id}-${++n}`), invalidIdMessage: 'x', onReload });

        loader.reload();
        expect(onReload).not.toHaveBeenCalled();

        loader.init();
        loader.reload();

        expect(onReload).toHaveBeenCalledTimes(1);
        expect(loader.value()).toBe('a-2');
    });

    it('paramName ile farklı rota parametresi', () => {
        params.next(convertToParamMap({ clinicId: 'k1' }));
        const fetch = vi.fn((id: string) => of(id));
        const loader = create({ fetch, invalidIdMessage: 'x', paramName: 'clinicId' });

        loader.init();

        expect(fetch).toHaveBeenCalledWith('k1');
    });
});
