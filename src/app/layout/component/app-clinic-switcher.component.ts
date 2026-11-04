import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Popover, PopoverModule } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { authFailureMessage } from '@/app/core/auth/auth-error.utils';
import { DEFAULT_PANEL_AFTER_AUTH } from '@/app/core/auth/auth-return-url.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClinicSwitcherRefreshService } from '@/app/core/tenant/clinic-switcher-refresh.service';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Panel topbar içinde aktif klinik gösterimi + çoklu klinik kullanıcıları için switcher.
 *
 * Tasarım:
 * - Tek orchestration: liste yükleme (lazy), panel aç/kapa, `selectClinic` çağrısı, post-switch refresh.
 * - Panel (taslak C): "Klinik değiştir" + arama, "Klinikleriniz" grubu, aktif klinikte "aktif" hapı.
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
    imports: [CommonModule, PopoverModule, ToastModule],
    providers: [MessageService],
    host: { class: 'app-clinic-switcher' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />

        @if (activeLabel(); as label) {
            <div class="layout-topbar-clinic-host">
                @if (canOpenClinicSwitcher()) {
                    <button
                        #triggerBtn
                        type="button"
                        class="layout-topbar-clinic layout-topbar-clinic-trigger"
                        aria-haspopup="dialog"
                        [attr.aria-expanded]="menuOpen()"
                        [attr.aria-label]="'Aktif klinik: ' + label + ' (değiştirmek için tıklayın)'"
                        [attr.title]="label"
                        (click)="onClinicTriggerClick($event)"
                    >
                        <i class="pi pi-building" aria-hidden="true"></i>
                        <span class="layout-topbar-clinic-text">{{ label }}</span>
                        <i class="pi pi-angle-down layout-topbar-clinic__caret" [class.layout-topbar-clinic__caret--busy]="loading() || submitting()" aria-hidden="true"></i>
                    </button>
                    <p-popover #clinicPanel styleClass="layout-topbar-panel" ariaLabel="Klinik değiştir" (onHide)="query.set('')">
                        <div class="pb-2" (keydown.escape)="closeAndFocusTrigger()" data-testid="clinic-panel">
                            <div class="px-4 pt-3 pb-2">
                                <div class="font-semibold mb-2">Klinik değiştir</div>
                                <label class="flex items-center gap-2 rounded-border border border-surface-300 dark:border-surface-600 px-2 py-1.5 text-sm text-muted-color focus-within:border-primary">
                                    <i class="pi pi-search text-xs" aria-hidden="true"></i>
                                    <input
                                        type="search"
                                        autofocus
                                        class="flex-1 min-w-0 bg-transparent border-0 outline-none p-0 text-sm text-color"
                                        placeholder="Klinik ara…"
                                        aria-label="Klinik ara"
                                        [value]="query()"
                                        (input)="query.set($any($event.target).value)"
                                        data-testid="clinic-search"
                                    />
                                </label>
                            </div>
                            <div class="layout-topbar-panel-group pt-1!" id="clinicPanelGroup">Klinikleriniz</div>
                            <ul class="list-none m-0 p-0" aria-labelledby="clinicPanelGroup">
                                @for (c of filteredClinics(); track c.id) {
                                    <li>
                                        <button type="button" class="layout-topbar-panel-row" [disabled]="submitting()" [attr.aria-current]="c.id === activeId() ? 'true' : null" (click)="onSelect(c)" data-testid="clinic-option">
                                            <span class="flex-1 min-w-0 truncate" [class.font-semibold]="c.id === activeId()">{{ c.name }}</span>
                                            @if (c.id === activeId()) {
                                                <span class="text-xs rounded-full px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary font-medium">aktif</span>
                                            }
                                        </button>
                                    </li>
                                } @empty {
                                    <li class="px-4 py-2 text-sm text-muted-color">Eşleşen klinik yok</li>
                                }
                            </ul>
                        </div>
                    </p-popover>
                } @else {
                    <span class="layout-topbar-clinic layout-topbar-clinic-trigger layout-topbar-clinic-trigger--readonly" [attr.title]="label" [attr.aria-label]="'Aktif klinik: ' + label" aria-disabled="true" tabindex="-1">
                        <i class="pi pi-building" aria-hidden="true"></i>
                        <span class="layout-topbar-clinic-text">{{ label }}</span>
                    </span>
                }
            </div>
        }
    `
})
export class AppClinicSwitcher {
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    private readonly clinicListRefresh = inject(ClinicSwitcherRefreshService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly menuRef = viewChild<Popover>('clinicPanel');
    private readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

    readonly clinics = signal<ClinicSummary[]>([]);
    readonly loading = signal(false);
    readonly submitting = signal(false);
    readonly hasLoadedOnce = signal(false);
    /** Panel açık (popover anında; kapanış animasyonunu beklemez). */
    readonly menuOpen = computed(() => this.menuRef()?.overlayVisible() ?? false);
    readonly query = signal('');

    readonly activeId = computed(() => this.auth.getJwtClinicId());
    readonly activeLabel = this.auth.activeClinicLabel;

    /** Yalnızca birden fazla klinik varken dropdown açılabilir. */
    readonly canOpenClinicSwitcher = computed(() => this.clinics().length > 1);

    constructor() {
        this.clinicListRefresh.onRefreshRequested.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reloadClinics(true));

        // Tek klinik kullanıcı tıklamadan önce liste bilinir; button yalnızca çoklu klinikte render edilir.
        this.reloadClinics(false);
    }

    /** Arama kutusu: Türkçe duyarlı, adın herhangi bir yerinde geçen. */
    readonly filteredClinics = computed(() => {
        const q = this.query().trim().toLocaleLowerCase('tr-TR');

        return q ? this.clinics().filter((c) => c.name.toLocaleLowerCase('tr-TR').includes(q)) : this.clinics();
    });

    /** Escape: panel kapanır, odak düğmeye döner (PrimeNG popover odak geri vermez). */
    closeAndFocusTrigger(): void {
        this.menuRef()?.hide();
        this.triggerEl()?.nativeElement.focus();
    }

    /** Tıklama document'a ulaşmalı: üst çubuktaki diğer paneller (zil, kullanıcı menüsü) dışarı tıklamayla kapanır. */
    onClinicTriggerClick(event: MouseEvent): void {
        event.preventDefault();

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

    /** Async callback'te orijinal `currentTarget` null olabilir; canlı trigger kullan. */
    private showClinicMenuFromTrigger(): void {
        const target = this.triggerEl()?.nativeElement;

        if (target) {
            this.menuRef()?.show(null, target);
        }
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

    onSelect(item: ClinicSummary): void {
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
                    window.location.replace(DEFAULT_PANEL_AFTER_AUTH);
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
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { sensitivity: 'base' }));
}
