import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { PublicAuthShellComponent } from '@/app/pages/public/components/public-auth-shell.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import {
    PASSWORD_POLICY_HINT,
    validateStrongPasswordValue
} from '@/app/core/validation/password-policy.util';
import { DEFAULT_PANEL_AFTER_AUTH } from '@/app/core/auth/auth-return-url.utils';
import { LegalConsentCheckboxComponent } from '@/app/features/legal-acceptance/components/legal-consent-checkbox.component';
import { isLegalVersionOutdatedError, LEGAL_ACCEPTANCE_CODE_MESSAGES } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';

@Component({
    selector: 'app-join-invite-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        PublicAuthShellComponent,
        LegalConsentCheckboxComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-auth-shell>
            @if (loading()) {
                <p class="m-0 text-center text-muted-color">Davet yükleniyor…</p>
            } @else if (loadError(); as le) {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">Davet açılamadı</h1>
                    <p class="public-auth-subtitle text-danger" role="alert">{{ le }}</p>
                </div>
                <p class="public-auth-alt">
                    <a routerLink="/auth/login" class="public-auth-link">Giriş sayfasına git</a>
                </p>
            } @else if (successMode(); as sm) {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">{{ sm === 'accept' ? 'Davet kabul edildi' : 'Hesap oluşturuldu' }}</h1>
                    <p class="public-auth-subtitle">
                        {{ sm === 'accept' ? 'İşletmeye katılımınız tamamlandı. Panele geçebilirsiniz.' : 'Şimdi giriş yaparak devam edebilirsiniz.' }}
                    </p>
                </div>
                @if (vm(); as inv) {
                    <dl class="public-auth-panel public-auth-facts">
                        <div><dt>İşletme</dt><dd>{{ inv.tenantName }}</dd></div>
                        <div><dt>Klinik</dt><dd>{{ inv.clinicName }}</dd></div>
                    </dl>
                }
                @if (sm === 'accept') {
                    <button pButton type="button" class="w-full public-auth-submit" (click)="goToPanel()">Panele git</button>
                } @else {
                    <button pButton type="button" class="w-full public-auth-submit" (click)="goToLoginAfterSignup()">Giriş yap</button>
                }
            } @else if (vm(); as inv) {
                <div class="public-auth-header">
                    <h1 class="public-auth-title">Davet</h1>
                    <p class="public-auth-subtitle">Sizi bir işletmeye davet ettiler. Bilgileri kontrol edin.</p>
                </div>

                <dl class="public-auth-panel public-auth-facts">
                    <div><dt>İşletme</dt><dd>{{ inv.tenantName }}</dd></div>
                    <div><dt>Klinik</dt><dd>{{ inv.clinicName }}</dd></div>
                    <div><dt>E-posta</dt><dd class="break-all">{{ inv.email }}</dd></div>
                    <div><dt>Son geçerlilik</dt><dd>{{ formatExpiry(inv.expiresAtUtc) }}</dd></div>
                    @let labels = statusLabels(inv);
                    @if (labels.length) {
                        <div data-testid="join-status"><dt>Durum</dt><dd>{{ labels.join(' · ') }}</dd></div>
                    }
                </dl>

                @if (inv.isExpired || !inv.canJoin) {
                    <p class="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 m-0 mb-4" role="status">
                        Bu davetle şu anda katılım yapılamıyor. Süre dolmuş veya davet geçersiz olabilir. Sorun devam ederse daveti gönderen
                        yöneticiyle iletişime geçin.
                    </p>
                }

                @if (auth.isAuthenticated() && inv.requiresSignup) {
                    <p class="public-auth-hint mb-4">
                        Bu bağlantı yeni hesap oluşturmayı gerektiriyor. Daveti kabul etmek için
                        <button type="button" class="public-auth-link public-auth-link--inline bg-transparent border-0 p-0 cursor-pointer underline" (click)="logoutForSignup(inv)">oturumu kapatıp</button>
                        tekrar deneyin veya daveti gizli pencerede açın.
                    </p>
                }

                @if (!auth.isAuthenticated() && inv.requiresLogin) {
                    <p class="public-auth-hint mb-3">Bu daveti kabul etmek için önce giriş yapmalısınız.</p>
                    <button pButton type="button" class="w-full public-auth-submit" (click)="goToLogin(inv)">Giriş yap</button>
                }

                @if (!auth.isAuthenticated() && !inv.requiresLogin && !inv.requiresSignup && inv.canJoin && !inv.isExpired) {
                    <p class="public-auth-hint mb-3">Devam etmek için giriş yapın.</p>
                    <button pButton type="button" class="w-full public-auth-submit" (click)="goToLogin(inv)">Giriş yap</button>
                }

                @if (!auth.isAuthenticated() && inv.requiresSignup && !inv.isExpired && inv.canJoin) {
                    <div class="public-auth-field">
                        <label for="invFullName" class="public-auth-label">Adınız soyadınız</label>
                        <input
                            pInputText
                            id="invFullName"
                            type="text"
                            class="w-full"
                            maxlength="120"
                            autocomplete="name"
                            [(ngModel)]="inviteFullName"
                            [attr.aria-invalid]="fullNameFieldError() ? true : null"
                            data-testid="join-full-name"
                        />
                        <p class="public-auth-hint">Hekim listelerinde ve kayıtlarda bu ad görünür.</p>
                        @if (fullNameFieldError()) {
                            <small class="text-danger block mt-1" role="alert">{{ fullNameFieldError() }}</small>
                        }
                    </div>
                    <div class="public-auth-field">
                        <label for="invPw" class="public-auth-label">Şifre belirleyin</label>
                        <p-password id="invPw" [(ngModel)]="invitePassword" [fluid]="true" [toggleMask]="true" [feedback]="false" class="w-full" placeholder="Şifre" />
                        <p class="public-auth-hint">{{ passwordPolicyHint }}</p>
                        @if (passwordFieldError()) {
                            <small class="text-danger block mt-1" role="alert">{{ passwordFieldError() }}</small>
                        }
                    </div>
                    @if (inv.requiredLegalDocuments.length) {
                        <div class="public-auth-consent">
                            <app-legal-consent-checkbox inputId="joinLegalConsent" [documents]="legalDocumentTypes(inv)" [disabled]="actionLoading()" [(checked)]="legalConsent" />
                        </div>
                    }
                    <button
                        pButton
                        type="button"
                        class="w-full public-auth-submit"
                        [disabled]="actionLoading() || (inv.requiredLegalDocuments.length > 0 && !legalConsent())"
                        (click)="onSignupAndAccept(inv)"
                    >@if (actionLoading()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Hesap oluştur ve katıl</button>
                }

                @if (showAccept(inv)) {
                    <button pButton type="button" class="w-full public-auth-submit" [disabled]="actionLoading()" (click)="onAccept(inv)">@if (actionLoading()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Daveti kabul et</button>
                }

                @if (actionError(); as ae) {
                    <div class="public-auth-alert" role="alert">
                        <div class="public-auth-alert-box">
                            <i class="pi pi-info-circle shrink-0 public-auth-alert-text" aria-hidden="true"></i>
                            <span class="public-auth-alert-text">{{ ae }}</span>
                        </div>
                    </div>
                }

                <p class="public-auth-alt">
                    <a routerLink="/auth/login" class="public-auth-link">Giriş sayfası</a>
                </p>
            }
        </app-public-auth-shell>
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
    readonly passwordFieldError = signal<string | null>(null);
    readonly passwordPolicyHint = PASSWORD_POLICY_HINT;
    /** Davetteki role gereken hukuki metinlerin onayı (ADR-029); sunucu da doğrular. */
    readonly legalConsent = signal(false);

    invitePassword = '';
    inviteFullName = '';
    readonly fullNameFieldError = signal<string | null>(null);

    legalDocumentTypes(inv: PublicInviteVm) {
        return inv.requiredLegalDocuments.map((d) => d.documentType);
    }

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

    /** Davetin durumu düz metin olarak (tıklanır görünen etiket yok, L-01). */
    statusLabels(inv: PublicInviteVm): string[] {
        return [
            ...(inv.isExpired ? ['Süresi dolmuş'] : []),
            ...(!inv.canJoin ? ['Katılım kapalı'] : []),
            ...(inv.requiresLogin ? ['Giriş gerekli'] : []),
            ...(inv.requiresSignup ? ['Kayıt gerekli'] : [])
        ];
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
        this.passwordFieldError.set(null);
        this.fullNameFieldError.set(null);
        const fullName = this.inviteFullName?.trim() ?? '';
        const pw = this.invitePassword ?? '';
        const passwordPolicyError = validateStrongPasswordValue(pw);

        if (!fullName) {
            this.fullNameFieldError.set('Adınızı ve soyadınızı yazın.');
        }

        if (passwordPolicyError) {
            this.passwordFieldError.set(passwordPolicyError);
        }

        if (!fullName || passwordPolicyError) {
            return;
        }

        if (inv.requiredLegalDocuments.length > 0 && !this.legalConsent()) {
            this.actionError.set(LEGAL_ACCEPTANCE_CODE_MESSAGES['LegalAcceptances.Required']);

            return;
        }

        this.actionLoading.set(true);
        this.invites
            .signupAndAccept(inv.inviteToken, { password: pw, fullName, acceptedLegalDocuments: inv.requiredLegalDocuments })
            .pipe(finalize(() => this.actionLoading.set(false)))
            .subscribe({
                next: () => this.successMode.set('signup'),
                error: (err: unknown) => {
                    this.actionError.set(publicInviteFailureMessage(err, 'Kayıt tamamlanamadı.'));

                    if (isLegalVersionOutdatedError(err)) {
                        this.refreshLegalDocuments(inv.inviteToken);
                    }
                }
            });
    }

    /** 409 sonrası güncel sürümleri davet detayından yeniden okur; girilen şifre korunur, onay yeniden istenir. */
    private refreshLegalDocuments(token: string): void {
        this.legalConsent.set(false);
        this.invites.getInviteByToken(token).subscribe({
            next: (v) => this.vm.set(v),
            error: () => undefined
        });
    }

    private reloadInvite(token: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.vm.set(null);
        this.successMode.set(null);
        this.actionError.set(null);
        this.passwordFieldError.set(null);
        this.legalConsent.set(false);
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
