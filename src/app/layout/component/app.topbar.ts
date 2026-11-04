import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Popover, PopoverModule } from 'primeng/popover';
import { AuthService } from '@/app/core/auth/auth.service';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import type { AccountSummary } from '@/app/features/account/models/account-summary.model';
import { AccountService } from '@/app/features/account/services/account.service';
import { resolveAccountAvatarInitials, resolveAccountDisplayName } from '@/app/features/account/utils/account-summary.utils';
import { AppClinicSwitcher } from './app-clinic-switcher.component';
import { AppGlobalSearch } from './app-global-search.component';
import { AppNotificationBell } from './app-notification-bell.component';
import { LayoutService } from '@/app/layout/service/layout.service';

/**
 * Üst çubuk. Zil, klinik seçici ve kullanıcı menüsü aynı tür panel (`p-popover`, `.layout-topbar-panel`; taslak C) açar;
 * aynı anda yalnız biri açık kalır: tetik tıklamaları document'a ulaşır, açık panel dışarı tıklama sayıp kapanır.
 */
@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, AppClinicSwitcher, AppGlobalSearch, AppNotificationBell, PopoverModule, ButtonModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ` <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button type="button" class="layout-menu-button layout-topbar-action" [attr.aria-label]="layoutService.isMenuRail() ? 'Menüyü genişlet' : 'Menü'" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <a class="layout-topbar-logo" routerLink="/panel">
                    <!-- Telefonda (≤ 575 px, MOBILE-004) yalnız simge: üst çubuktaki düğmelere yer kalsın -->
                    <picture>
                        <source media="(max-width: 575px)" [attr.srcset]="iconSrc()" />
                        <img [src]="logoSrc()" [alt]="logoAlt" class="layout-topbar-logo-img" width="168" height="40" />
                    </picture>
                </a>
            </div>

            <div class="layout-topbar-actions">
                <app-global-search />
                <app-clinic-switcher />
                <app-notification-bell />

                <div class="layout-config-menu">
                    <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()" [attr.aria-label]="layoutService.themeToggleLabel()">
                        <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                    </button>
                </div>

                <div class="relative">
                    <button
                        #userTrigger
                        type="button"
                        class="layout-topbar-action"
                        [class.bg-surface-hover]="userMenuOpen()"
                        (click)="userMenu.toggle($event)"
                        aria-haspopup="dialog"
                        [attr.aria-expanded]="userMenuOpen()"
                        aria-label="Kullanıcı menüsü"
                    >
                        <i class="pi pi-user"></i>
                    </button>
                    <p-popover #userMenu styleClass="layout-topbar-panel layout-topbar-user-menu" ariaLabel="Kullanıcı menüsü" (onShow)="onUserMenuShow()">
                        <div class="pb-2" (keydown.escape)="closeUserMenuAndFocusTrigger()" data-testid="user-panel">
                            <div class="px-4 pt-4 pb-1 text-center">
                                <span class="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary inline-flex items-center justify-center font-semibold" aria-hidden="true">
                                    @if (account(); as a) {
                                        {{ initials(a) }}
                                    } @else {
                                        <i class="pi pi-user"></i>
                                    }
                                </span>
                                @if (account(); as a) {
                                    <span class="block font-semibold mt-2 truncate" data-testid="user-panel-name">{{ displayName(a) }}</span>
                                    @if (displayName(a) !== a.email) {
                                        <span class="block text-xs text-muted-color truncate">{{ a.email }}</span>
                                    }
                                }
                            </div>
                            @for (g of userMenuGroups; track g.label) {
                                <div class="layout-topbar-panel-group" [id]="'userMenuGroup-' + $index">{{ g.label }}</div>
                                <ul class="list-none m-0 p-0" [attr.aria-labelledby]="'userMenuGroup-' + $index">
                                    @for (item of g.items; track item.label) {
                                        <li>
                                            @if (item.routerLink) {
                                                <a class="layout-topbar-panel-row" [routerLink]="item.routerLink" [attr.autofocus]="$first && g === userMenuGroups[0] ? '' : null" (click)="userMenu.hide()">
                                                    <i [class]="item.icon" class="w-4 text-muted-color" aria-hidden="true"></i>{{ item.label }}
                                                </a>
                                            } @else {
                                                <button type="button" class="layout-topbar-panel-row" (click)="userMenu.hide(); item.command?.({})"><i [class]="item.icon" class="w-4 text-muted-color" aria-hidden="true"></i>{{ item.label }}</button>
                                            }
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </p-popover>
                </div>
            </div>
        </div>
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />`
})
export class AppTopbar implements OnInit {
    readonly logoAlt = 'Vetinity';
    readonly layoutService = inject(LayoutService);

    readonly logoSrc = computed(() => (this.layoutService.layoutConfig().darkTheme ? VETINITY_BRAND_LOGOS.compactLockupDark : VETINITY_BRAND_LOGOS.compactLockup));

    readonly iconSrc = computed(() => (this.layoutService.layoutConfig().darkTheme ? VETINITY_BRAND_LOGOS.iconDark : VETINITY_BRAND_LOGOS.icon));

    readonly auth = inject(AuthService);
    private readonly account$ = inject(AccountService);
    private readonly router = inject(Router);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly userMenuRef = viewChild<Popover>('userMenu');
    private readonly userTriggerEl = viewChild<ElementRef<HTMLButtonElement>>('userTrigger');

    /** Panel açık (popover anında; kapanış animasyonunu beklemez). */
    readonly userMenuOpen = computed(() => this.userMenuRef()?.overlayVisible() ?? false);
    /** Panel başlığı (ad, e-posta); ilk açılışta yüklenir. Alınamazsa başlık yalnız simge. */
    readonly account = signal<AccountSummary | null>(null);
    readonly displayName = resolveAccountDisplayName;
    readonly initials = resolveAccountAvatarInitials;

    userMenuGroups: { label: string; items: MenuItem[] }[] = [];

    ngOnInit(): void {
        this.userMenuGroups = [
            { label: 'Hesap', items: [{ label: 'Hesabım', icon: 'pi pi-user', routerLink: ['/panel/settings/account'] }] },
            {
                label: 'Oturum',
                items: [
                    { label: 'Çıkış yap', icon: 'pi pi-sign-out', command: () => this.logoutCurrent() },
                    { label: 'Tüm oturumları kapat', icon: 'pi pi-ban', command: () => this.logoutAll() }
                ]
            }
        ];
    }

    /** Başlık bilgisi ilk açılışta yüklenir. */
    onUserMenuShow(): void {
        if (!this.account()) {
            this.account$.getAccountSummary().subscribe({ next: (a) => this.account.set(a), error: () => undefined });
        }
    }

    /** Escape: panel kapanır, odak düğmeye döner (PrimeNG popover odak geri vermez). */
    closeUserMenuAndFocusTrigger(): void {
        this.userMenuRef()?.hide();
        this.userTriggerEl()?.nativeElement.focus();
    }

    toggleDarkMode() {
        this.layoutService.toggleDarkMode();
    }

    private logoutCurrent(): void {
        this.auth.logoutCurrentSession().subscribe({
            next: () => void this.router.navigate(['/auth/login'], { replaceUrl: true }),
            error: () => {
                this.auth.logout();
                void this.router.navigate(['/auth/login'], { replaceUrl: true });
            }
        });
    }

    private logoutAll(): void {
        this.confirmationService.confirm({
            header: 'Tüm oturumları kapat',
            message: 'Tüm cihazlardaki oturumlarınızı kapatmak istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Tümünü kapat',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.auth.logoutAllSessions().subscribe({
                    next: () => void this.router.navigate(['/auth/login'], { replaceUrl: true }),
                    error: () => {
                        this.auth.logout();
                        void this.router.navigate(['/auth/login'], { replaceUrl: true });
                    }
                });
            }
        });
    }
}
