import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppFooter } from './app.footer';
import { AppReadOnlyBannerComponent } from './app-read-only-banner.component';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppFooter, AppReadOnlyBannerComponent],
    template: `<div class="layout-wrapper" [ngClass]="containerClass()">
        <div #primePanelOverlayHost class="layout-prime-panel-overlay-host"></div>
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <app-read-only-banner />
                <router-outlet></router-outlet>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask"></div>
    </div> `
})
export class AppLayout {
    layoutService = inject(LayoutService);
    private readonly tenantReadOnlyContext = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly primePanelOverlayHostEl = viewChild<ElementRef<HTMLElement>>('primePanelOverlayHost');

    constructor() {
        this.tenantReadOnlyContext.loadForPanel();

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
    })
}
