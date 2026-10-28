import { Injectable, signal } from '@angular/core';
import type { MenuBadgeKey } from '@/app/core/routing/panel-navigation';

/**
 * Menü sayacını besleyen sayfa: aynı veriyi zaten yükleyen sayfa (ör. Bugün, filtresiz) sayıyı buraya yazar; menü sayacı
 * bu sürede kendi sorgusunu atlar. Sayfa kapanınca ya da filtre değişince `release` ile sayaç kendi sorgusuna döner.
 */
@Injectable({ providedIn: 'root' })
export class MenuBadgeFeed {
    private readonly values = signal<Readonly<Partial<Record<MenuBadgeKey, number>>>>({});

    report(key: MenuBadgeKey, count: number): void {
        this.values.update((current) => ({ ...current, [key]: count }));
    }

    release(key: MenuBadgeKey): void {
        this.values.update(({ [key]: _released, ...rest }) => rest);
    }

    /** Sayfanın bildirdiği değer; bildiren yoksa `undefined`. */
    value(key: MenuBadgeKey): number | undefined {
        return this.values()[key];
    }
}
