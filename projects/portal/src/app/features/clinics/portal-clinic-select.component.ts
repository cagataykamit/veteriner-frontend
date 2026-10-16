import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { PortalEmptyState } from '@portal/app/shared/ui/portal-states.component';

/**
 * Çok klinikli hesapta klinik seçimi iskeleti (ADR-031 AK-3; `GET /me` bağ listesi). Seçim bu cihazda hatırlanır;
 * her klinik ayrı veri sorumlusudur, görünüm klinik başınadır.
 */
@Component({
    selector: 'portal-clinic-select',
    standalone: true,
    imports: [RouterLink, PortalBrandHeader, PortalFooter, PortalEmptyState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="portal-page portal-stack">
            <portal-brand-header />
            <h1 class="portal-title">Klinik seçin</h1>
            @if (session.links().length === 0) {
                <portal-empty-state title="Bağlı klinik yok" message="Kliniğinizden yeni bir portal daveti isteyebilirsiniz." icon="fa-hospital" />
            } @else {
                <p class="portal-muted">Hesabınız birden fazla kliniğe bağlı. Bilgilerini görmek istediğiniz kliniği seçin.</p>
                <ul class="portal-option-list" aria-label="Klinikler">
                    @for (link of session.links(); track link.linkId) {
                        <li>
                            <button
                                type="button"
                                class="portal-option"
                                [class.is-active]="session.activeLink()?.linkId === link.linkId"
                                [attr.aria-current]="session.activeLink()?.linkId === link.linkId ? 'true' : null"
                                (click)="select(link.linkId)"
                            >
                                <span class="portal-brand-badge" aria-hidden="true">{{ initial(link.clinicName) }}</span>
                                <span class="portal-option-text">
                                    <strong>{{ link.clinicName }}</strong>
                                    <span class="portal-muted">{{ link.clientFullName }}</span>
                                </span>
                                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                            </button>
                        </li>
                    }
                </ul>
                @if (session.activeLink()) {
                    <a class="portal-link-button" routerLink="/">Vazgeç</a>
                }
            }
            <portal-footer />
        </main>
    `
})
export class PortalClinicSelectComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    initial(name: string): string {
        return name.trim().charAt(0).toLocaleUpperCase('tr-TR');
    }

    select(linkId: string): void {
        this.session.selectLink(linkId);
        void this.router.navigateByUrl('/');
    }
}
