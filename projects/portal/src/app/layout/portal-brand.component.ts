import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PORTAL_PRIVACY_PATH, PORTAL_TERMS_PATH } from '@portal/app/features/legal/portal-legal-documents';

/**
 * Marka başlığı (ADR-031 AK-10): klinik biliniyorsa klinik adı ve harf rozeti, bilinmiyorsa Vetinity.
 * Klinik logosu sözleşmede henüz yok; rozet yer tutucudur.
 */
@Component({
    selector: 'portal-brand-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <header class="portal-brand">
            @if (clinicName(); as name) {
                <span class="portal-brand-badge" aria-hidden="true">{{ initial() }}</span>
                <span class="portal-brand-name">{{ name }}</span>
            } @else {
                <img class="portal-brand-logo" src="icons/icon-192.png" alt="" width="40" height="40" />
                <span class="portal-brand-name">Vetinity</span>
            }
            <ng-content />
        </header>
    `
})
export class PortalBrandHeader {
    readonly clinicName = input<string | null>(null);

    readonly initial = computed(() => (this.clinicName() ?? '').trim().charAt(0).toLocaleUpperCase('tr-TR'));
}

/** Alt bilgi: Vetinity ve portal belgeleri (AK-10: alt bilgide Vetinity). */
@Component({
    selector: 'portal-footer',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <footer class="portal-footer">
            <nav aria-label="Hukuki belgeler">
                <a [routerLink]="termsPath">Kullanım Şartları</a>
                <span aria-hidden="true">·</span>
                <a [routerLink]="privacyPath">Gizlilik Politikası</a>
            </nav>
            <p>Vetinity ile çalışır</p>
        </footer>
    `
})
export class PortalFooter {
    readonly termsPath = PORTAL_TERMS_PATH;
    readonly privacyPath = PORTAL_PRIVACY_PATH;
}
