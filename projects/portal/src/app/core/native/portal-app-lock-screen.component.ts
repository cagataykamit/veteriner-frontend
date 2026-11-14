import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalAppLock } from './portal-app-lock';

/**
 * Uygulama kilitliyken tüm içeriğin üstünü kapatan ekran (`PortalAppLock`). Görününce kimlik doğrulama kendiliğinden
 * istenir; vazgeçilirse "Kilidi aç" ile yeniden denenir ya da çıkış yapılır.
 */
@Component({
    selector: 'portal-app-lock-screen',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (lock.locked()) {
            <div class="portal-app-lock" role="dialog" aria-modal="true" aria-labelledby="app-lock-title" data-testid="app-lock">
                <section class="portal-card portal-stack portal-center">
                    <img class="portal-app-lock-logo" src="icons/icon-192.png" alt="" width="64" height="64" />
                    <h1 id="app-lock-title" class="portal-title">Vetinity kilitli</h1>
                    <p class="portal-muted">Devam etmek için parmak izi ya da yüz tanıma ile kimliğinizi doğrulayın.</p>
                    <div class="portal-actions">
                        <button pButton type="button" [disabled]="busy()" (click)="unlock()" data-testid="app-lock-unlock">Kilidi aç</button>
                        <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busy()" (click)="logout()" data-testid="app-lock-logout">Çıkış yap</button>
                    </div>
                </section>
            </div>
        }
    `
})
export class PortalAppLockScreen {
    protected readonly lock = inject(PortalAppLock);
    private readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    readonly busy = signal(false);

    constructor() {
        effect(() => {
            if (this.lock.locked()) {
                untracked(() => void this.unlock());
            }
        });
    }

    async unlock(): Promise<void> {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        try {
            await this.lock.unlock();
        } finally {
            this.busy.set(false);
        }
    }

    logout(): void {
        this.busy.set(true);
        this.session.logout().subscribe(() => {
            this.lock.release();
            this.busy.set(false);
            void this.router.navigateByUrl('/login', { replaceUrl: true });
        });
    }
}
