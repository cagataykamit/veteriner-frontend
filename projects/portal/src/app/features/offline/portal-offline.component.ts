import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PortalBrandHeader } from '@portal/app/layout/portal-brand.component';

/**
 * Çevrimdışı iskelet sayfası: oturum sunucuya ulaşılamadığı için doğrulanamadı. Uygulama kabuğu service worker
 * önbelleğinden açılır; kişisel veri önbellekte tutulmadığı için içerik gösterilmez.
 */
@Component({
    selector: 'portal-offline',
    standalone: true,
    imports: [ButtonModule, PortalBrandHeader],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="portal-page portal-stack">
            <portal-brand-header />
            <section class="portal-card portal-state" aria-labelledby="offline-title">
                <i class="fa-solid fa-wifi portal-state-icon" aria-hidden="true"></i>
                <h1 id="offline-title" class="portal-title">İnternet bağlantısı yok</h1>
                <p class="portal-muted">Bilgilerinizi göstermek için bağlantı gerekiyor. Bağlandığınızda tekrar deneyin.</p>
                <button pButton type="button" class="portal-button-block" (click)="retry()">Tekrar dene</button>
            </section>
        </main>
    `
})
export class PortalOfflineComponent {
    private readonly router = inject(Router);

    retry(): void {
        void this.router.navigateByUrl('/');
    }
}
