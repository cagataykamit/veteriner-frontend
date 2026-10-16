import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Tarayıcının çevrim içi durumu (`online`/`offline` olayları). Uygulama kabuğu çevrimdışı bandını buna göre gösterir. */
@Injectable({ providedIn: 'root' })
export class PortalNetworkStatus {
    private readonly onlineSignal = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

    readonly online = this.onlineSignal.asReadonly();

    constructor() {
        const update = () => this.onlineSignal.set(navigator.onLine);

        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        inject(DestroyRef).onDestroy(() => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        });
    }
}
