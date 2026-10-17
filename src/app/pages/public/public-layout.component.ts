import { DOCUMENT } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicFooterComponent } from './components/public-footer.component';
import { PublicTopbarComponent } from './components/public-topbar.component';
import { PUBLIC_MAIN_CONTENT_ID } from '@/app/features/public/utils/public-navigation.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

/** `html` sınıfı: tanıtım sayfalarında kök yazı boyutu 16 px (public-page-theme.scss). */
export const PUBLIC_SITE_ROOT_CLASS = 'public-site-root';

/** Tanıtım sitesi ortak iskeleti (tasarım belgesi bölüm 4): üst çubuk + sayfa + alt bilgi. Hukuki sayfalar da bu iskelette. */
@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [RouterOutlet, PublicTopbarComponent, PublicFooterComponent],
    template: `
        <div class="public-page flex min-h-screen flex-col overflow-x-hidden bg-surface-0 dark:bg-surface-950">
            <app-public-topbar />
            <main [id]="mainContentId" class="relative flex-1">
                <router-outlet />
            </main>
            <app-public-footer />
        </div>
    `
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
    private readonly document = inject(DOCUMENT);
    readonly mainContentId = PUBLIC_MAIN_CONTENT_ID;

    ngOnInit(): void {
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
        this.document.documentElement.classList.add(PUBLIC_SITE_ROOT_CLASS);
    }

    ngOnDestroy(): void {
        this.document.documentElement.classList.remove(PUBLIC_SITE_ROOT_CLASS);
    }
}
