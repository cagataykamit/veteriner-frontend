import { Injectable, OnDestroy, signal } from '@angular/core';

/** Fare satırdan panele (ya da panelden satıra) geçerken panelin kapanmadan beklediği süre. */
export const MENU_FLYOUT_CLOSE_DELAY_MS = 150;

/**
 * Menü alt sayfa panellerinin (flyout) ortak durumu: aynı anda yalnız bir panel açıktır.
 * `AppMenu` düzeyinde sağlanır; satırlar ve paneller aynı örneği kullanır.
 */
@Injectable()
export class MenuFlyoutService implements OnDestroy {
    private readonly openKeyState = signal<string | null>(null);
    private closeTimer: ReturnType<typeof setTimeout> | undefined;

    /** Açık panelin satır anahtarı (menü öğesinin adı); kapalıysa `null`. */
    readonly openKey = this.openKeyState.asReadonly();

    open(key: string): void {
        this.cancelClose();
        this.openKeyState.set(key);
    }

    close(): void {
        this.cancelClose();
        this.openKeyState.set(null);
    }

    /** Kısa gecikmeyle kapatır; bu arada başka satır ya da panelin kendisi `open`/`cancelClose` çağırırsa kapanmaz. */
    scheduleClose(): void {
        this.cancelClose();
        this.closeTimer = setTimeout(() => this.close(), MENU_FLYOUT_CLOSE_DELAY_MS);
    }

    cancelClose(): void {
        clearTimeout(this.closeTimer);
        this.closeTimer = undefined;
    }

    ngOnDestroy(): void {
        this.cancelClose();
    }
}
