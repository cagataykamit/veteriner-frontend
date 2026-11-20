import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppReadOnlyBannerComponent } from './app-read-only-banner.component';
import { AppSectionTabsComponent } from './app-section-tabs.component';
import { AppUpdateNoticeComponent } from './app-update-notice.component';
import { LayoutService } from '@/app/layout/service/layout.service';
import { LegalAcceptanceGateComponent } from '@/app/features/legal-acceptance/components/legal-acceptance-gate.component';
import { UnsavedChangesDialogComponent } from '@/app/shared/ui/unsaved-changes/unsaved-changes-dialog.component';
import { UnsavedChangesService } from '@/app/shared/ui/unsaved-changes/unsaved-changes.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppReadOnlyBannerComponent, AppSectionTabsComponent, LegalAcceptanceGateComponent, UnsavedChangesDialogComponent, AppUpdateNoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div class="layout-wrapper" [ngClass]="containerClass()">
        <a class="layout-skip-link" href="#panel-main" (click)="skipToMain($event)">İçeriğe geç</a>
        <div #primePanelOverlayHost class="layout-prime-panel-overlay-host"></div>
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <main #main id="panel-main" class="layout-main" tabindex="-1">
                <app-read-only-banner />
                <app-section-tabs />
                <!-- Açık sayfa, sekme kapatma uyarısı için izlenir (O2). -->
                <router-outlet (activate)="unsavedChanges.setActivePage($event)" (deactivate)="unsavedChanges.clearActivePage($event)"></router-outlet>
            </main>
        </div>
        <div class="layout-mask"></div>
        <app-unsaved-changes-dialog />
        <app-update-notice />
        <!-- Bekleyen hukuki kabul penceresi (ADR-029); ilk paketi büyütmemek için ayrı parça. Durum rota çözülürken okunur, parça hemen yüklenir (H18). -->
        @defer (on immediate) {
            <app-legal-acceptance-gate />
        }
    </div> `
})
export class AppLayout {
    layoutService = inject(LayoutService);
    private readonly auth = inject(AuthService);
    protected readonly unsavedChanges = inject(UnsavedChangesService);
    private readonly tenantReadOnlyContext = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly primePanelOverlayHostEl = viewChild<ElementRef<HTMLElement>>('primePanelOverlayHost');
    private readonly mainEl = viewChild<ElementRef<HTMLElement>>('main');

    constructor() {
        this.tenantReadOnlyContext.loadForPanel();
        this.layoutService.restoreMenuCollapsed(this.auth.getUserId());

        effect(() => {
            const state = this.layoutService.layoutState();

            if (state.mobileMenuActive) {
                document.body.classList.add('blocked-scroll');
            } else {
                document.body.classList.remove('blocked-scroll');
            }
        });

        afterNextRender(() => {
            const el = this.primePanelOverlayHostEl()?.nativeElement ?? null;

            this.layoutService.setPrimePanelOverlayHost(el);
        });

        this.destroyRef.onDestroy(() => {
            this.layoutService.setPrimePanelOverlayHost(null);
        });
    }

    containerClass = computed(() => {
        const config = this.layoutService.layoutConfig();
        const state = this.layoutService.layoutState();

        return {
            'layout-overlay': config.menuMode === 'overlay',
            'layout-static': config.menuMode === 'static',
            'layout-static-inactive': state.staticMenuDesktopInactive && config.menuMode === 'static',
            'layout-overlay-active': state.overlayMenuActive,
            'layout-mobile-active': state.mobileMenuActive
        };
    });

    /** "İçeriğe geç": adres değişmeden odak sayfa içeriğine geçer (menü ve üst çubuk atlanır). */
    skipToMain(event: Event): void {
        event.preventDefault();
        this.mainEl()?.nativeElement.focus();
    }
}
