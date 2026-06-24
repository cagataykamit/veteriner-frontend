import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Menu, MenuModule } from 'primeng/menu';
import { StyleClassModule } from 'primeng/styleclass';
import { finalize } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { AppClinicSwitcher } from './app-clinic-switcher.component';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';

/** Topbar user `p-menu` body overlay — clinic switcher menüsünden ayrı hedeflenir. */
const TOPBAR_USER_MENU_OVERLAY_SELECTORS = [
    '.layout-topbar-user-menu',
    '.p-menu.p-menu-overlay.layout-topbar-user-menu',
    '[data-pc-name="menu"].layout-topbar-user-menu'
] as const;

const TOPBAR_USER_MENU_OVERLAY_ANCESTOR_SELECTORS =
    '.p-menu-overlay, .p-connected-overlay, p-menu, p-motion';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator, AppClinicSwitcher, MenuModule, ButtonModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
                <img
                    [src]="panelLogoSrc()"
                    alt="Vetinity"
                    class="layout-topbar-logo-img"
                    [class.layout-topbar-logo-img--icon]="panelLogoIsIcon()"
                    width="168"
                    height="40"
                />
            </a>
        </div>

        <div class="layout-topbar-actions">
            <app-clinic-switcher />

            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
                <div class="relative">
                    <button
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                        pStyleClass="@next"
                        enterFromClass="hidden"
                        enterActiveClass="animate-scalein"
                        leaveToClass="hidden"
                        leaveActiveClass="animate-fadeout"
                        [hideOnOutsideClick]="true"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <app-configurator />
                </div>
            </div>

            <div class="relative">
                <button
                    type="button"
                    class="layout-topbar-action"
                    (click)="userMenu.toggle($event)"
                    aria-haspopup="true"
                    aria-label="Kullanıcı menüsü"
                >
                    <i class="pi pi-user"></i>
                </button>
                <p-menu
                    #userMenu
                    [popup]="true"
                    [model]="userMenuItems"
                    styleClass="layout-topbar-user-menu"
                    appendTo="body"
                    (onHide)="onUserMenuHide()"
                />
            </div>

            <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Takvim</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Mesajlar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />`
})
export class AppTopbar implements OnInit, OnDestroy {
    readonly brand = VETINITY_BRAND_LOGOS;
    readonly layoutService = inject(LayoutService);
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly userMenuRef = viewChild<Menu>('userMenu');

    userMenuItems: MenuItem[] = [];

    readonly panelLogoIsIcon = computed(
        () => this.layoutService.layoutState().staticMenuDesktopInactive || !this.layoutService.isDesktop()
    );

    readonly panelLogoSrc = computed(() =>
        this.panelLogoIsIcon() ? this.brand.icon : this.brand.compactLockup
    );

    ngOnInit(): void {
        this.userMenuItems = [
            { label: 'Çıkış yap', icon: 'pi pi-sign-out', command: () => this.onUserMenuLogoutCurrent() },
            { label: 'Tüm oturumları kapat', icon: 'pi pi-ban', command: () => this.onUserMenuLogoutAll() }
        ];
    }

    ngOnDestroy(): void {
        this.purgeTopbarUserMenuOverlay();
    }

    onUserMenuHide(): void {
        this.purgeTopbarUserMenuOverlay();
    }

    private onUserMenuLogoutCurrent(): void {
        this.purgeTopbarUserMenuOverlay();
        queueMicrotask(() => this.logoutCurrent());
    }

    private onUserMenuLogoutAll(): void {
        this.purgeTopbarUserMenuOverlay();
        queueMicrotask(() => this.logoutAll());
    }

    /** Yalnız topbar user `p-menu` body overlay’ini hedefler; clinic switcher menüsüne dokunmaz. */
    private purgeTopbarUserMenuOverlay(): void {
        this.userMenuRef()?.hide();

        const doc = this.document;
        const removed = new Set<Element>();

        for (const selector of TOPBAR_USER_MENU_OVERLAY_SELECTORS) {
            doc.querySelectorAll(selector).forEach((el) => {
                const overlay =
                    el.closest(TOPBAR_USER_MENU_OVERLAY_ANCESTOR_SELECTORS) ?? el;
                if (!removed.has(overlay)) {
                    removed.add(overlay);
                    overlay.remove();
                }
            });
        }

        for (const child of Array.from(doc.body.children)) {
            if (
                child.matches('.layout-topbar-user-menu') ||
                child.querySelector('.layout-topbar-user-menu')
            ) {
                if (!removed.has(child)) {
                    removed.add(child);
                    child.remove();
                }
            }
        }
    }

    toggleDarkMode() {
        this.layoutService.toggleDarkMode();
    }

    private logoutCurrent(): void {
        this.auth
            .logoutCurrentSession()
            .pipe(finalize(() => this.purgeTopbarUserMenuOverlay()))
            .subscribe({
                next: () => {
                    this.purgeTopbarUserMenuOverlay();
                    void this.router.navigate(['/auth/login'], { replaceUrl: true });
                },
                error: () => {
                    this.auth.logout();
                    this.purgeTopbarUserMenuOverlay();
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
            reject: () => this.purgeTopbarUserMenuOverlay(),
            accept: () => {
                this.purgeTopbarUserMenuOverlay();
                this.auth
                    .logoutAllSessions()
                    .pipe(finalize(() => this.purgeTopbarUserMenuOverlay()))
                    .subscribe({
                        next: () => {
                            this.purgeTopbarUserMenuOverlay();
                            void this.router.navigate(['/auth/login'], { replaceUrl: true });
                        },
                        error: () => {
                            this.auth.logout();
                            this.purgeTopbarUserMenuOverlay();
                            void this.router.navigate(['/auth/login'], { replaceUrl: true });
                        }
                    });
            }
        });
    }
}
