import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicFooterComponent } from './components/public-footer.component';
import { PublicTopbarComponent } from './components/public-topbar.component';
import { PUBLIC_MAIN_CONTENT_ID } from '@/app/features/public/utils/public-navigation.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

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
export class PublicLayoutComponent implements OnInit {
    private readonly document = inject(DOCUMENT);
    readonly mainContentId = PUBLIC_MAIN_CONTENT_ID;

    ngOnInit(): void {
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
    }
}
