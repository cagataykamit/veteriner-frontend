import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PublicInviteVm } from '@/app/features/public/models/public-invite-vm.model';
import { PublicInviteService } from '@/app/features/public/services/public-invite.service';
import { publicInviteFailureMessage } from '@/app/features/public/utils/public-invite-error.utils';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { DEFAULT_PANEL_AFTER_AUTH } from '@/app/core/auth/auth-return-url.utils';

@Component({
    selector: 'app-join-invite-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 min-h-screen min-w-screen py-10 px-4">
            <div class="max-w-lg mx-auto">
                <div class="card mb-0">
                    @if (loading()) {
                        <p class="m-0 text-muted-color">Davet yükleniyor…</p>
                    } @else if (loadError(); as le) {
                        <h2 class="mt-0 mb-2 text-xl text-surface-900 dark:text-surface-0">Davet açılamadı</h2>
                        <p class="text-red-500 m-0 mb-4" role="alert">{{ le }}</p>
                        <a routerLink="/auth/login" class="text-primary font-medium no-underline">Giriş sayfasına git</a>
                    } @else if (successMode(); as sm) {
                        <h2 class="mt-0 mb-2 text-xl text-surface-900 dark:text-surface-0">
                            {{ sm === 'accept' ? 'Davet kabul edildi' : 'Hesap oluşturuldu' }}
                        </h2>
                        <p class="text-muted-color m-0 mb-4">
                            {{
                                sm === 'accept'
                                    ? 'İşletmeye katılımınız tamamlandı. Panele geçebilirsiniz.'
                                    : 'Şimdi giriş yaparak devam edebilirsiniz.'
                            }}
                        </p>
                        @if (vm(); as inv) {
                            <ul class="text-sm m-0 mb-4 pl-4 text-muted-color">
                                <li>İşletme: {{ inv.tenantName }}</li>
                                <li>Klinik: {{ inv.clinicName }}</li>
                            </ul>
                        }
                        @if (sm === 'accept') {
                            <p-button label="Panele git" styleClass="w-full" (onClick)="goToPanel()" />
                        } @else {
                            <p-button label="Giriş yap" styleClass="w-full" (onClick)="goToLoginAfterSignup()" />
                        }
                    } @else if (vm(); as inv) {
                        <h2 class="mt-0 mb-2 text-xl text-surface-900 dark:text-surface-0">Davet</h2>
                        <p class="text-muted-color text-sm m-0 mb-4">Sizi bir işletmeye davet ettiler. Bilgileri kontrol edin.</p>

                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-4 text-sm">
                            <div class="mb-2"><span class="text-muted-color">İşletme:</span> {{ inv.tenantName }}</div>
                            <div class="mb-2"><span class="text-muted-color">Klinik:</span> {{ inv.clinicName }}</div>
                            <div class="mb-2"><span class="text-muted-color">E-posta:</span> {{ inv.email }}</div>
                            <div class="mb-0">
                                <span class="text-muted-color">Son geçerlilik:</span> {{ formatExpiry(inv.expiresAtUtc) }}
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-2 mb-4">
                            @if (inv.isExpired) {
                                <span class="text-xs font-medium px-2 py-1 rounded bg-red-500/15 text-red-800 dark:text-red-200">Süresi dolmuş</span>
                            }
                            @if (!inv.canJoin) {
                                <span class="text-xs font-medium px-2 py-1 rounded bg-surface-200 dark:bg-surface-700">Katılım kapalı</span>
                            }
                            @if (inv.requiresLogin) {
                                <span class="text-xs font-medium px-2 py-1 rounded bg-primary-500/15 text-primary">Giriş gerekli</span>
                            }
                            @if (inv.requiresSignup) {
                                <span class="text-xs font-medium px-2 py-1 rounded bg-primary-500/15 text-primary">Kayıt gerekli</span>
                            }
                        </div>

                        @if (inv.isExpired || !inv.canJoin) {
                            <p class="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded p-3 m-0 mb-4" role="status">
                                Bu davetle şu anda katılım yapılamıyor. Süre dolmuş veya davet geçersiz olabilir. Sorun devam ederse daveti gönderen
                                yöneticiyle iletişime geçin.
                            </p>
                        }

                        @if (auth.isAuthenticated() && inv.requiresSignup) {
                            <p class="text-sm text-muted-color m-0 mb-4">
                                Bu bağlantı yeni hesap oluşturmayı gerektiriyor. Daveti kabul etmek için
                                <button type="button" class="text-primary font-medium bg-transparent border-0 p-0 cursor-pointer underline" (click)="logoutForSignup(inv)">
                                    oturumu kapatıp
                                </button>
                                tekrar deneyin veya daveti gizli pencerede açın.
                            </p>
                        }

                        @if (!auth.isAuthenticated() && inv.requiresLogin) {
                            <p class="m-0 mb-3 text-sm">Bu daveti kabul etmek için önce giriş yapmalısınız.</p>
                            <p-button label="Giriş yap" styleClass="w-full mb-3" (onClick)="goToLogin(inv)" />
                        }

                        @if (!auth.isAuthenticated() && !inv.requiresLogin && !inv.requiresSignup && inv.canJoin && !inv.isExpired) {
                            <p class="m-0 mb-3 text-sm">Devam etmek için giriş yapın.</p>
                            <p-button label="Giriş yap" styleClass="w-full mb-3" (onClick)="goToLogin(inv)" />
                        }

                        @if (!auth.isAuthenticated() && inv.requiresSignup && !inv.isExpired && inv.canJoin) {
                            <label for="invPw" class="block text-sm font-medium mb-2">Şifre belirleyin</label>
                            <p-password
                                id="invPw"
                                [(ngModel)]="invitePassword"
                                [fluid]="true"
                                [toggleMask]="true"
                                [feedback]="true"
                                styleClass="w-full mb-3"
                                placeholder="Şifre"
                            />
                            <p-button
                                label="Hesap oluştur ve katıl"
                                styleClass="w-full"
                                [loading]="actionLoading()"
                                [disabled]="actionLoading()"
                                (onClick)="onSignupAndAccept(inv)"
                            />
                        }

                        @if (showAccept(inv)) {
                            <p-button
                                label="Daveti kabul et"
                                styleClass="w-full"
                                [loading]="actionLoading()"
                                [disabled]="actionLoading()"
                                (onClick)="onAccept(inv)"
                            />
                        }

                        @if (actionError(); as ae) {
                            <p class="text-red-500 text-sm m-0 mt-4" role="alert">{{ ae }}</p>
                        }

                        <p class="text-center m-0 mt-6 mb-0">
                            <a routerLink="/auth/login" class="text-primary font-medium no-underline text-sm">Giriş sayfası</a>
                        </p>
                    }
                </div>
            </div>
        </div>
    `
})
export class JoinInvitePageComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly invites = inject(PublicInviteService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly vm = signal<PublicInviteVm | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionLoading = signal(false);
    readonly successMode = signal<'accept' | 'signup' | null>(null);

    invitePassword = '';

    readonly formatExpiry = (v: string | null) => formatDateTimeDisplay(v);

    ngOnInit(): void {
        removeOrphanedPrimeMenuPopupsFromBody(document);
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
            const token = p.get('token')?.trim() ?? '';
            if (!token) {
                this.loading.set(false);
                this.loadError.set('Davet bağlantısında eksik bilgi var.');
                return;
            }
            this.reloadInvite(token);
        });
    }

    showAccept(inv: PublicInviteVm): boolean {
        if (!this.auth.isAuthenticated() || !inv.canJoin || inv.isExpired) {
            return false;
        }
        if (inv.requiresSignup) {
            return false;
        }
        return true;
    }

    goToLogin(inv: PublicInviteVm): void {
        void this.router.navigate(['/auth/login'], {
            queryParams: {
                inviteToken: inv.inviteToken,
                email: inv.email?.trim() || undefined
            }
        });
    }

    goToLoginAfterSignup(): void {
        const inv = this.vm();
        const email = inv?.email?.trim() ?? '';
        void this.router.navigate(['/auth/login'], {
            queryParams: {
                inviteAccepted: '1',
                ...(email ? { email } : {})
            }
        });
    }

    goToPanel(): void {
        void this.router.navigateByUrl(DEFAULT_PANEL_AFTER_AUTH);
    }

    logoutForSignup(inv: PublicInviteVm): void {
        this.auth.logout();
        void this.router.navigate(['/join', inv.inviteToken], { replaceUrl: true });
    }

    onAccept(inv: PublicInviteVm): void {
        this.actionError.set(null);
        this.actionLoading.set(true);
        this.invites
            .acceptInvite(inv.inviteToken)
            .pipe(finalize(() => this.actionLoading.set(false)))
            .subscribe({
                next: () => this.successMode.set('accept'),
                error: (err: unknown) => this.actionError.set(publicInviteFailureMessage(err, 'Davet kabul edilemedi.'))
            });
    }

    onSignupAndAccept(inv: PublicInviteVm): void {
        this.actionError.set(null);
        const pw = this.invitePassword ?? '';
        if (!pw) {
            this.actionError.set('Şifre zorunludur.');
            return;
        }
        this.actionLoading.set(true);
        this.invites
            .signupAndAccept(inv.inviteToken, { password: pw })
            .pipe(finalize(() => this.actionLoading.set(false)))
            .subscribe({
                next: () => this.successMode.set('signup'),
                error: (err: unknown) => this.actionError.set(publicInviteFailureMessage(err, 'Kayıt tamamlanamadı.'))
            });
    }

    private reloadInvite(token: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.vm.set(null);
        this.successMode.set(null);
        this.actionError.set(null);
        this.invitePassword = '';
        this.invites.getInviteByToken(token).subscribe({
            next: (v) => {
                this.vm.set(v);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.loadError.set(publicInviteFailureMessage(err, 'Davet yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
