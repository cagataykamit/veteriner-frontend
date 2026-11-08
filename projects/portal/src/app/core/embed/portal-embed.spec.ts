import type { DestroyRef } from '@angular/core';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { isEmbeddableRoute, isFramed, PORTAL_EMBED_HEIGHT_MESSAGE, PORTAL_EMBEDDABLE, reportEmbedHeight } from './portal-embed';

describe('portal-embed', () => {
    it('çerçeveyi pencere karşılaştırmasıyla, erişim hatasını çerçeve sayarak bulur', () => {
        const self = {} as Window;

        expect(isFramed({ self, top: self } as unknown as Window)).toBe(false);
        expect(isFramed({ self, top: {} } as unknown as Window)).toBe(true);
        expect(
            isFramed({
                self,
                get top(): Window {
                    throw new Error('SecurityError');
                }
            } as unknown as Window)
        ).toBe(true);
    });

    it('gömülebilirliği en derin rotanın verisinden okur', () => {
        const route = (data: object, firstChild: ActivatedRouteSnapshot | null = null) => ({ data, firstChild }) as unknown as ActivatedRouteSnapshot;

        expect(isEmbeddableRoute(route({}, route({ [PORTAL_EMBEDDABLE]: true })))).toBe(true);
        expect(isEmbeddableRoute(route({ [PORTAL_EMBEDDABLE]: true }, route({})))).toBe(false);
    });

    it('yükseklik değişince üst pencereye yalnız tür ve yükseklik gönderir; yok edilince durur', () => {
        let callback: () => void = () => undefined;
        const disconnect = vi.fn();

        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(cb: () => void) {
                    callback = cb;
                }
                observe(): void {}
                disconnect = disconnect;
            }
        );

        const postMessage = vi.fn();
        let height = 640.2;
        const element = { getBoundingClientRect: () => ({ height }) } as unknown as HTMLElement;
        let onDestroy: () => void = () => undefined;
        const destroyRef = { onDestroy: (fn: () => void) => (onDestroy = fn) } as unknown as DestroyRef;

        reportEmbedHeight(element, { parent: { postMessage } } as unknown as Window, destroyRef);
        callback();
        callback();
        height = 900;
        callback();
        onDestroy();
        vi.unstubAllGlobals();

        expect(postMessage.mock.calls).toEqual([
            [{ type: PORTAL_EMBED_HEIGHT_MESSAGE, height: 641 }, '*'],
            [{ type: PORTAL_EMBED_HEIGHT_MESSAGE, height: 900 }, '*']
        ]);
        expect(disconnect).toHaveBeenCalled();
    });
});
