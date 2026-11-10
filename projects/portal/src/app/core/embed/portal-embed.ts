import { DestroyRef, InjectionToken } from '@angular/core';
import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Başka bir sitenin içinde (iframe) açılma kuralları (APPT-021; sözleşme `ONLINE_APPOINTMENT_API_CONTRACT.md` §15). Yalnız
 * rota verisinde `PORTAL_EMBEDDABLE` taşıyan sayfa gömülü çizilir; diğer bütün sayfalar çerçevede içerik göstermez (tıklama
 * tuzağı). Yayın sunucusunun `frame-ancestors` başlığı ilk yüklemeyi korur; uygulama içi geçişi bu kural korur.
 */

/** Rota verisi anahtarı: sayfa kimliksizdir, oturum ya da hesap işlemi yoktur, başka sitenin içinde açılabilir. */
export const PORTAL_EMBEDDABLE = 'embeddable';

/** Gömen sayfaya giden yükseklik iletisinin türü (panelin verdiği gömme kodu bunu dinler). */
export const PORTAL_EMBED_HEIGHT_MESSAGE = 'vetinity-randevu-yukseklik';

/** Pencere çerçeve içinde mi; erişim engellenirse (başka köken) çerçevede sayılır. */
export function isFramed(win: Window): boolean {
    try {
        return win.self !== win.top;
    } catch {
        return true;
    }
}

/** Uygulama bir çerçevenin içinde mi açıldı (testte sağlayıcıyla değiştirilir). */
export const PORTAL_FRAMED = new InjectionToken<boolean>('PORTAL_FRAMED', {
    providedIn: 'root',
    factory: () => typeof window !== 'undefined' && isFramed(window)
});

/** Etkin rotanın en derin parçası gömülebilir mi. */
export function isEmbeddableRoute(root: ActivatedRouteSnapshot): boolean {
    let route = root;

    while (route.firstChild) {
        route = route.firstChild;
    }

    return route.data[PORTAL_EMBEDDABLE] === true;
}

/**
 * Gömülü sayfanın yüksekliğini üst pencereye bildirir; gömme kodundaki betik çerçeveyi buna göre uzatır. İleti yalnız piksel
 * yüksekliği taşır, kişisel veri taşımaz; bu yüzden hedef köken sınırlanmaz (gömen sitenin adresi önceden bilinmez).
 */
export function reportEmbedHeight(element: HTMLElement, win: Window, destroyRef: DestroyRef): void {
    if (typeof ResizeObserver === 'undefined') {
        return;
    }

    let last = 0;
    const observer = new ResizeObserver(() => {
        const height = Math.ceil(element.getBoundingClientRect().height);

        if (height !== last) {
            last = height;
            win.parent.postMessage({ type: PORTAL_EMBED_HEIGHT_MESSAGE, height }, '*');
        }
    });

    observer.observe(element);
    destroyRef.onDestroy(() => observer.disconnect());
}
