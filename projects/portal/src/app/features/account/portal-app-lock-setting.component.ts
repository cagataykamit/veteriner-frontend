import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PortalAppLock } from '@portal/app/core/native/portal-app-lock';

/**
 * Hesabım > Uygulama kilidi (MOBILE-002): yalnız mağaza uygulamasında ve cihazda parmak izi ya da yüz tanıma kayıtlıysa görünür.
 * Açmak için kimlik bir kez doğrulanır; kapatmak doğrulama istemez (oturum zaten açık).
 */
@Component({
    selector: 'portal-app-lock-setting',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (available()) {
            <section class="portal-card portal-stack" aria-labelledby="app-lock-setting-title" data-testid="app-lock-setting">
                <h2 id="app-lock-setting-title" class="portal-subtitle">Uygulama kilidi</h2>
                <label class="portal-check">
                    <input
                        type="checkbox"
                        role="switch"
                        data-testid="app-lock-switch"
                        [checked]="lock.enabled()"
                        [disabled]="busy()"
                        [attr.aria-checked]="lock.enabled()"
                        aria-describedby="app-lock-hint"
                        (change)="toggle($any($event.target))"
                    />
                    <span>
                        Parmak izi ya da yüz tanıma ile aç
                        <span id="app-lock-hint" class="portal-field-hint">Uygulama açılırken ve 5 dakikadan uzun arka planda kaldıktan sonra kimliğiniz sorulur.</span>
                    </span>
                </label>
                @if (error()) {
                    <p class="portal-field-error" role="alert">{{ error() }}</p>
                }
            </section>
        }
    `
})
export class PortalAppLockSetting {
    protected readonly lock = inject(PortalAppLock);

    readonly available = signal(false);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor() {
        void this.lock.available().then((available) => this.available.set(available));
    }

    async toggle(input: HTMLInputElement): Promise<void> {
        this.error.set(null);

        if (!input.checked) {
            this.lock.disable();

            return;
        }

        this.busy.set(true);
        const enabled = await this.lock.enable();

        this.busy.set(false);

        if (!enabled) {
            input.checked = false;
            this.error.set('Kimliğiniz doğrulanamadı; uygulama kilidi açılmadı.');
        }
    }
}
