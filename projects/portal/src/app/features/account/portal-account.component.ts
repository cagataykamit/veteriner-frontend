import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { isClinicPortalClosed, type PortalLink } from '@portal/app/core/auth/portal-auth.models';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { PortalNotificationPreferencesComponent } from '@portal/app/features/notifications/portal-notification-preferences.component';
import { PortalAppLockSetting } from './portal-app-lock-setting.component';

/** Hesabım: oturum bilgisi, klinik değiştirme, bildirim tercihleri (§10), uygulama kilidi (yalnız mobil uygulama), veri talebine geçiş (§11), çıkış, tüm cihazlardan çıkış (sözleşme §5.7) ve hesap silmeye geçiş (§5.10). */
@Component({
    selector: 'portal-account',
    standalone: true,
    imports: [RouterLink, ButtonModule, MessageModule, PortalNotificationPreferencesComponent, PortalAppLockSetting],
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

            <portal-notification-preferences />

            <portal-app-lock-setting />

            @if (session.activeLink(); as link) {
                @if (!isClosed(link)) {
                    <section class="portal-card portal-stack" aria-labelledby="account-data-requests-title">
                        <h2 id="account-data-requests-title" class="portal-subtitle">Verilerimle ilgili talep</h2>
                        <p class="portal-muted">{{ link.clinicName }} kliniğindeki kayıtlarınıza erişmek, düzeltilmesini ya da silinmesini istemek için KVKK başvurusu yapın.</p>
                        <a class="portal-link-button" routerLink="/account/data-requests" data-testid="account-data-requests">Talep oluştur ve taleplerimi gör</a>
                    </section>
                }
            }

            <section class="portal-card portal-stack" aria-labelledby="account-session-title">
                <h2 id="account-session-title" class="portal-subtitle">Oturum</h2>
                @if (error(); as message) {
                    <p-message severity="error" role="alert">{{ message }}</p-message>
                }
                @if (confirmAll()) {
                    <p role="alert">Bu hesabın açık olduğu tüm cihazlardan çıkış yapılacak. Emin misiniz?</p>
                    <div class="portal-actions">
                        <button pButton type="button" severity="danger" [disabled]="busy()" (click)="logoutAll()">@if (busy()) {<i class="p-button-icon fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>}Evet, tüm cihazlardan çıkış yap</button>
                        <button pButton type="button" severity="secondary" [outlined]="true" (click)="confirmAll.set(false)">Vazgeç</button>
                    </div>
                } @else {
                    <div class="portal-actions">
                        <button pButton type="button" severity="secondary" [disabled]="busy()" (click)="logout()">@if (busy()) {<i class="p-button-icon fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>}Çıkış yap</button>
                        <button pButton type="button" severity="danger" [outlined]="true" (click)="confirmAll.set(true)">Tüm cihazlardan çıkış yap</button>
                    </div>
                }
            </section>

            <section class="portal-card portal-stack" aria-labelledby="account-delete-title">
                <h2 id="account-delete-title" class="portal-subtitle">Hesabı sil</h2>
                <p class="portal-muted">Portal hesabınızı kalıcı olarak silebilirsiniz. Klinikteki kayıtlarınız silinmez.</p>
                <a class="portal-link-button" routerLink="/account/delete">Hesabımı silmek istiyorum</a>
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

    isClosed(link: PortalLink): boolean {
        return isClinicPortalClosed(link);
    }

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
