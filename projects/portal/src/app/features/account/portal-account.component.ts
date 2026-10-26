import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';

/** Hesabım: oturum bilgisi, klinik değiştirme, çıkış ve tüm cihazlardan çıkış (sözleşme §5.7). */
@Component({
    selector: 'portal-account',
    standalone: true,
    imports: [RouterLink, ButtonModule, MessageModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-stack">
            <h1 class="portal-title">Hesabım</h1>

            @if (session.me(); as me) {
                <section class="portal-card portal-stack" aria-labelledby="account-info-title">
                    <h2 id="account-info-title" class="portal-subtitle">Giriş bilgileri</h2>
                    <p class="portal-muted">{{ me.email }}</p>
                    <p class="portal-muted">{{ me.hasPassword ? 'Kodla veya parolayla giriş yapabilirsiniz.' : 'E-postanıza gelen kodla giriş yapıyorsunuz.' }}</p>
                    @if (session.links().length > 1) {
                        <a class="portal-link-button" routerLink="/clinics">Klinik değiştir</a>
                    }
                </section>
            }

            <section class="portal-card portal-stack" aria-labelledby="account-session-title">
                <h2 id="account-session-title" class="portal-subtitle">Oturum</h2>
                @if (error(); as message) {
                    <p-message severity="error" role="alert">{{ message }}</p-message>
                }
                @if (confirmAll()) {
                    <p role="alert">Bu hesabın açık olduğu tüm cihazlardan çıkış yapılacak. Emin misiniz?</p>
                    <div class="portal-actions">
                        <p-button label="Evet, tüm cihazlardan çıkış yap" severity="danger" [loading]="busy()" (onClick)="logoutAll()" />
                        <p-button label="Vazgeç" severity="secondary" [outlined]="true" (onClick)="confirmAll.set(false)" />
                    </div>
                } @else {
                    <div class="portal-actions">
                        <p-button label="Çıkış yap" severity="secondary" [loading]="busy()" (onClick)="logout()" />
                        <p-button label="Tüm cihazlardan çıkış yap" severity="danger" [outlined]="true" (onClick)="confirmAll.set(true)" />
                    </div>
                }
            </section>
        </div>
    `
})
export class PortalAccountComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    readonly busy = signal(false);
    readonly confirmAll = signal(false);
    readonly error = signal<string | null>(null);

    logout(): void {
        this.busy.set(true);
        this.session.logout().subscribe(() => void this.router.navigateByUrl('/login', { replaceUrl: true }));
    }

    logoutAll(): void {
        this.busy.set(true);
        this.error.set(null);
        this.session.logoutAll().subscribe({
            next: () => void this.router.navigateByUrl('/login', { replaceUrl: true }),
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err));
            }
        });
    }
}
