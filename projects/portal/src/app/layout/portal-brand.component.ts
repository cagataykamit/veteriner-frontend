import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PORTAL_PRIVACY_PATH, PORTAL_TERMS_PATH } from '@portal/app/features/legal/portal-legal-documents';

/**
 * Marka başlığı (ADR-031 AK-10): klinik biliniyorsa klinik adı ve harf rozeti, bilinmiyorsa Vetinity. Kliniğe özel bağlantı
 * sayfası kliniğin sitesindeki logoyu verir (APPT-022); logo yüklenemezse harf rozetine döner. Ad ana sayfaya götürür;
 * sayfalarda ayrıca "Geri" yoktur (oturum yoksa ana sayfa girişe yönlendirir).
 */
@Component({
    selector: 'portal-brand-header',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="portal-brand">
            <a class="portal-brand-home" routerLink="/" aria-label="Ana sayfa" data-testid="brand-home">
                @if (clinicName(); as name) {
                    @if (logoUrl() && !logoFailed()) {
                        <img class="portal-brand-clinic-logo" [src]="logoUrl()" alt="" height="40" data-testid="brand-clinic-logo" (error)="logoFailed.set(true)" />
                    } @else {
                        <span class="portal-brand-badge" aria-hidden="true">{{ initial() }}</span>
                    }
                    <span class="portal-brand-name">{{ name }}</span>
                } @else {
                    <img class="portal-brand-logo" src="icons/icon-192.png" alt="" width="40" height="40" />
                    <span class="portal-brand-name">Vetinity</span>
                }
            </a>
            <ng-content />
        </header>
    `
})
export class PortalBrandHeader {
    readonly clinicName = input<string | null>(null);
    /** Kliniğin logosu; yalnız klinik adıyla birlikte çizilir, ad metin olarak yine yazılır (logo süstür, `alt` boş). */
    readonly logoUrl = input<string | null>(null);

    readonly logoFailed = signal(false);
    readonly initial = computed(() => (this.clinicName() ?? '').trim().charAt(0).toLocaleUpperCase('tr-TR'));
}

/**
 * Alt bilgi: Vetinity ve portal belgeleri (AK-10: alt bilgide Vetinity). Başka sitenin içinde (APPT-021) belgeler yeni sekmede
 * açılır: çerçevede yalnız talep sayfası çizilir.
 */
@Component({
    selector: 'portal-footer',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <footer class="portal-footer">
            <nav aria-label="Hukuki belgeler">
                <a [routerLink]="termsPath" [target]="linkTarget()" [attr.rel]="newTab() ? 'noopener' : null">Kullanım Şartları</a>
                <span aria-hidden="true">·</span>
                <a [routerLink]="privacyPath" [target]="linkTarget()" [attr.rel]="newTab() ? 'noopener' : null">Gizlilik Politikası</a>
            </nav>
            <p>Vetinity ile çalışır</p>
        </footer>
    `
})
export class PortalFooter {
    readonly newTab = input(false);

    readonly termsPath = PORTAL_TERMS_PATH;
    readonly privacyPath = PORTAL_PRIVACY_PATH;
    readonly linkTarget = computed(() => (this.newTab() ? '_blank' : undefined));
}
