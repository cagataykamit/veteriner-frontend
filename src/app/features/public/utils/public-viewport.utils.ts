import { DestroyRef, signal, type Signal } from '@angular/core';

/**
 * Tanıtım sitesinin telefon kırılımı: 768 px altı. Üst çubuğun opak şeridi (`public-site.scss`) ve ana sayfanın telefon düzeni
 * (T-03 B) aynı sınırı kullanır; değer stil dosyasında da `767.98px` olarak geçer.
 */
export const PUBLIC_PHONE_MEDIA_QUERY = '(max-width: 767.98px)';

/** Görünüm telefon genişliğinde mi; genişlik değişince güncellenir. `matchMedia` olmayan ortamda (test) masaüstü sayılır. */
export function publicPhoneViewport(destroyRef: DestroyRef): Signal<boolean> {
    const phone = signal(false);

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return phone.asReadonly();
    }

    const query = window.matchMedia(PUBLIC_PHONE_MEDIA_QUERY);
    const update = (): void => phone.set(query.matches);

    update();
    query.addEventListener('change', update);
    destroyRef.onDestroy(() => query.removeEventListener('change', update));

    return phone.asReadonly();
}
