import { Injectable, signal } from '@angular/core';
import type { MenuBadgeKey } from '@/app/core/routing/panel-navigation';

/**
 * Menü sayacını besleyen sayfa: aynı veriyi zaten yükleyen sayfa (ör. Bugün, filtresiz) sayıyı buraya yazar; menü sayacı
 * bu sürede kendi sorgusunu atlar. Sayfa kapanınca ya da filtre değişince `release` ile sayaç kendi sorgusuna döner.
 * Sayfa açılırken `claim` eder: ilk yanıtı gelmeden menü aynı isteği ikinci kez atmaz.
 */
@Injectable({ providedIn: 'root' })
export class MenuBadgeFeed {
    /** `null`: sayfa üstlendi, sayı henüz gelmedi. */
    private readonly values = signal<Readonly<Partial<Record<MenuBadgeKey, number | null>>>>({});

    /** Sayfa bu sayacı kendisi besleyecek; bildirilmiş sayı varsa korunur. */
    claim(key: MenuBadgeKey): void {
        this.values.update((current) => (key in current ? current : { ...current, [key]: null }));
    }

    report(key: MenuBadgeKey, count: number): void {
        this.values.update((current) => ({ ...current, [key]: count }));
    }

    release(key: MenuBadgeKey): void {
        this.values.update(({ [key]: _released, ...rest }) => rest);
    }

    /** Sayfanın bildirdiği değer; sayfa üstlendi ama sayı gelmediyse `null`, besleyen yoksa `undefined`. */
    value(key: MenuBadgeKey): number | null | undefined {
        return this.values()[key];
    }
}
