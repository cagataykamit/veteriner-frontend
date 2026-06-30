import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { authFailureMessage } from '@/app/core/auth/auth-error.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClinicSwitcherRefreshService } from '@/app/layout/service/clinic-switcher-refresh.service';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Panel topbar içinde aktif klinik gösterimi + çoklu klinik kullanıcıları için switcher.
 *
 * Tasarım:
 * - Tek orchestration: liste yükleme (lazy), menü aç/kapa, `selectClinic` çağrısı, post-switch refresh.
 * - Token/JWT parse YOK; tüm clinic state `AuthService` üzerinden okunur.
 * - localStorage'a doğrudan erişim YOK; tokenlar `auth.selectClinic` içinde persist edilir.
 * - `/me/clinics` mount'ta sessiz yüklenir; tek klinikte button DOM'a girmez, dropdown açılmaz.
 *
 * Toast pattern: projenin mevcut feature componentlerindeki ile aynı (`providers: [MessageService]`
 * + `<p-toast position="bottom-right" />` + `addTracedToast`).
 */
@Component({
    selector: 'app-clinic-switcher',
    standalone: true,
    imports: [CommonModule, MenuModule, ToastModule],
    providers: [MessageService],
    host: { class: 'app-clinic-switcher' },
    template: `
        <p-toast position="bottom-right" />

        @if (activeLabel(); as label) {
            <div class="layout-topbar-clinic-host">
                @if (canOpenClinicSwitcher()) {
                    <button
                        #triggerBtn
                        type="button"
                        class="layout-topbar-clinic layout-topbar-clinic-trigger"
                        aria-haspopup="true"
                        [attr.aria-expanded]="menuOpen()"
                        [attr.aria-label]="'Aktif klinik: ' + label + ' (değiştirmek için tıklayın)'"
                        [attr.title]="label"
                        (click)="onClinicTriggerClick($event)"
                    >
                        <i class="pi pi-building" aria-hidden="true"></i>
                        <span class="layout-topbar-clinic-text">{{ label }}</span>
                        <i
                            class="pi pi-angle-down layout-topbar-clinic__caret"
                            [class.layout-topbar-clinic__caret--busy]="loading() || submitting()"
                            aria-hidden="true"
                        ></i>
                    </button>
                    <p-menu
                        #clinicMenu
                        [popup]="true"
                        [model]="menuItems()"
                        styleClass="layout-clinic-switcher-menu"
                        appendTo="body"
                        (onShow)="menuOpen.set(true)"
                        (onHide)="menuOpen.set(false)"
                    />
                } @else {
                    <span
                        class="layout-topbar-clinic layout-topbar-clinic-trigger layout-topbar-clinic-trigger--readonly"
                        [attr.title]="label"
                        [attr.aria-label]="'Aktif klinik: ' + label"
                        aria-disabled="true"
                        tabindex="-1"
                    >
                        <i class="pi pi-building" aria-hidden="true"></i>
                        <span class="layout-topbar-clinic-text">{{ label }}</span>
                    </span>
                }
            </div>
        }
    `
})
export class AppClinicSwitcher implements OnDestroy {
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    private readonly clinicListRefresh = inject(ClinicSwitcherRefreshService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly menuRef = viewChild<Menu>('clinicMenu');
    private readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

    readonly clinics = signal<ClinicSummary[]>([]);
    readonly loading = signal(false);
    readonly submitting = signal(false);
    readonly hasLoadedOnce = signal(false);
    readonly menuOpen = signal(false);

    readonly activeId = computed(() => this.auth.getJwtClinicId());
    readonly activeLabel = this.auth.activeClinicLabel;

    /** Yalnızca birden fazla klinik varken dropdown açılabilir. */
    readonly canOpenClinicSwitcher = computed(() => this.clinics().length > 1);

    constructor() {
        this.clinicListRefresh.onRefreshRequested
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.reloadClinics(true));

        // Tek klinik kullanıcı tıklamadan önce liste bilinir; button yalnızca çoklu klinikte render edilir.
        this.reloadClinics(false);
    }

    readonly menuItems = computed<MenuItem[]>(() => {
        const activeId = this.activeId();
        const busy = this.submitting();
        return this.clinics().map((c) => {
            const isActive = c.id === activeId;
            return {
                label: c.name,
                icon: isActive ? 'pi pi-check' : 'pi pi-circle',
                disabled: busy,
                styleClass: isActive ? 'layout-clinic-switcher-menu__item--active' : undefined,
                command: () => this.onSelect(c)
            };
        });
    });

    ngOnDestroy(): void {
        this.menuRef()?.hide();
        removeOrphanedPrimeMenuPopupsFromBody(document);
    }

    onClinicTriggerClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.submitting() || !this.canOpenClinicSwitcher()) {
            return;
        }

        if (!this.hasLoadedOnce()) {
            this.reloadClinics(false, () => {
                if (!this.canOpenClinicSwitcher()) {
                    return;
                }
                this.showClinicMenuFromTrigger();
            });
            return;
        }

        this.menuRef()?.toggle(event);
    }

    /** PrimeNG `Menu.show` async callback'te orijinal `currentTarget` null olabilir; canlı trigger kullan. */
    private showClinicMenuFromTrigger(): void {
        const target = this.triggerEl()?.nativeElement;
        if (!target) {
            return;
        }
        this.menuRef()?.show({ currentTarget: target });
    }

    private reloadClinics(forceRefresh = false, then?: () => void): void {
        if (this.loading()) {
            return;
        }
        this.loading.set(true);
        this.auth
            .getMyClinics(forceRefresh)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (items) => {
                    this.clinics.set(sortClinicsByName(filterClinicsForSelection(items)));
                    this.hasLoadedOnce.set(true);
                    if (!this.canOpenClinicSwitcher()) {
                        this.menuRef()?.hide();
                    }
                    then?.();
                },
                error: (e: unknown) => {
                    if (forceRefresh) {
                        return;
                    }
                    this.showErrorToast(e, 'Klinikler yüklenemedi.');
                }
            });
    }

    private onSelect(item: ClinicSummary): void {
        this.menuRef()?.hide();
        if (item.id === this.activeId()) {
            return;
        }
        this.submitting.set(true);
        this.auth
            .selectClinic(item.id, item.name)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
                next: () => {
                    // Aynı URL'e SPA navigasyonu Angular varsayılan `onSameUrlNavigation: 'ignore'`
                    // ile yutulur; klinik switch context değişimi olduğundan hard reload ile
                    // uygulama yeni token / clinic_id ile temiz boot eder.
                    // Not: `tenantReadOnlyContext.loadForPanel()` çağrılmaz — reload onu hemen iptal
                    // eder (backend `TaskCanceledException`), AppLayout zaten boot sonrası çağırır.
                    window.location.replace('/panel/dashboard');
                },
                error: (e: unknown) => {
                    this.showErrorToast(e, 'Klinik değiştirilemedi.');
                    this.refreshClinicsListAfterError();
                }
            });
    }

    /** Switch hatası sonrası liste paslı olabilir (klinik pasifleştirildi vb.) → force refresh. */
    private refreshClinicsListAfterError(): void {
        this.reloadClinics(true);
    }

    private showErrorToast(e: unknown, fallback: string): void {
        const message = e instanceof HttpErrorResponse ? authFailureMessage(e, fallback) : fallback;
        addTracedToast(this.messages, 'clinic-switcher', '/panel', {
            severity: 'error',
            summary: 'Hata',
            detail: message,
            life: 6000
        });
    }
}

/** `/me/clinics` yanıtında `isActive` yoksa tüm kayıtlar kalır; `false` olanlar switch'te gösterilmez. */
function filterClinicsForSelection(list: readonly ClinicSummary[]): ClinicSummary[] {
    return list.filter((c) => c.isActive !== false);
}

/** Türkçe duyarlı sıralama; aynı tüketim mantığı `select-clinic.ts` ile uyumlu. */
function sortClinicsByName(list: readonly ClinicSummary[]): ClinicSummary[] {
    return [...list].sort((a, b) =>
        a.name.localeCompare(b.name, 'tr-TR', { sensitivity: 'base' })
    );
}
