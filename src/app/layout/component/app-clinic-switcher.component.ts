import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { authFailureMessage } from '@/app/core/auth/auth-error.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Panel topbar içinde aktif klinik gösterimi + çoklu klinik kullanıcıları için switcher.
 *
 * Tasarım:
 * - Tek orchestration: liste yükleme (lazy), menü aç/kapa, `selectClinic` çağrısı, post-switch refresh.
 * - Token/JWT parse YOK; tüm clinic state `AuthService` üzerinden okunur.
 * - localStorage'a doğrudan erişim YOK; tokenlar `auth.selectClinic` içinde persist edilir.
 * - `/me/clinics` çağrısı sadece ilk açılışta (lazy); sonraki açılışlar 120 sn TTL cache'inden döner.
 * - Tek kliniği olan kullanıcı için trigger tıklanmaz, mevcut statik görünüm korunur.
 *
 * Toast pattern: projenin mevcut feature componentlerindeki ile aynı (`providers: [MessageService]`
 * + `<p-toast position="top-right" />` + `addTracedToast`).
 */
@Component({
    selector: 'app-clinic-switcher',
    standalone: true,
    imports: [CommonModule, MenuModule, ToastModule],
    providers: [MessageService],
    host: { class: 'app-clinic-switcher' },
    template: `
        <p-toast position="top-right" />

        @if (activeLabel(); as label) {
            <div class="layout-topbar-clinic-host">
                @if (isInteractive()) {
                    <button
                        #triggerBtn
                        type="button"
                        class="layout-topbar-clinic layout-topbar-clinic--interactive"
                        [attr.aria-haspopup]="'true'"
                        [attr.aria-expanded]="menuOpen()"
                        [attr.aria-label]="'Aktif klinik: ' + label + ' (değiştirmek için tıklayın)'"
                        [attr.title]="label"
                        [disabled]="submitting()"
                        (click)="onTriggerClick($event)"
                    >
                        <i class="pi pi-building" aria-hidden="true"></i>
                        <span class="layout-topbar-clinic-text">{{ label }}</span>
                        @if (showCaret()) {
                            <i
                                class="pi pi-angle-down layout-topbar-clinic__caret"
                                [class.layout-topbar-clinic__caret--busy]="loading() || submitting()"
                                aria-hidden="true"
                            ></i>
                        }
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
                    <span class="layout-topbar-clinic" [attr.title]="label">
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

    private readonly menuRef = viewChild<Menu>('clinicMenu');
    private readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

    readonly clinics = signal<ClinicSummary[]>([]);
    readonly loading = signal(false);
    readonly submitting = signal(false);
    readonly hasLoadedOnce = signal(false);
    readonly menuOpen = signal(false);

    readonly activeId = computed(() => this.auth.getJwtClinicId());
    readonly activeLabel = this.auth.activeClinicLabel;
    readonly isMulti = computed(() => this.clinics().length > 1);

    /** Henüz yüklenmediyse keşif için tıklanabilir; yüklenmişse yalnızca çoklu klinik için aktif. */
    readonly isInteractive = computed(() => !this.hasLoadedOnce() || this.isMulti());

    /** Caret yalnız interaktif modda görünür; tek klinikse hint verilmez. */
    readonly showCaret = this.isInteractive;

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

    onTriggerClick(event: Event): void {
        if (this.submitting()) {
            return;
        }
        if (!this.hasLoadedOnce()) {
            this.loadMyClinics(() => {
                if (!this.isMulti()) {
                    return;
                }
                // PrimeNG `Menu.show(event)` `event.currentTarget`'a güvenir; orijinal MouseEvent
                // async HTTP cevabı geldiğinde tarayıcı tarafından `currentTarget = null`'a düşürülmüş
                // olur ve menü body fallback ile `left: 0`'da açılır. Canlı buton referansını
                // synthetic event olarak geçerek doğru hizalama sağlanır.
                const target = this.triggerEl()?.nativeElement;
                if (!target) {
                    return;
                }
                const menuEvent: { currentTarget: HTMLElement } = { currentTarget: target };
                this.menuRef()?.show(menuEvent);
            });
            return;
        }
        if (!this.isMulti()) {
            return;
        }
        this.menuRef()?.toggle(event);
    }

    private loadMyClinics(then?: () => void): void {
        if (this.loading()) {
            return;
        }
        this.loading.set(true);
        this.auth
            .getMyClinics()
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (items) => {
                    this.clinics.set(sortClinicsByName(filterClinicsForSelection(items)));
                    this.hasLoadedOnce.set(true);
                    then?.();
                },
                error: (e: unknown) => {
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
        this.auth.getMyClinics(true).subscribe({
            next: (items) => {
                this.clinics.set(sortClinicsByName(filterClinicsForSelection(items)));
            },
            error: () => {
                /* sessiz: ana hata zaten kullanıcıya gösterildi. */
            }
        });
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
